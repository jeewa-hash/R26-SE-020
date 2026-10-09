from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupKFold, GroupShuffleSplit, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "real_forms"
PROCESSED_DIR = ROOT / "data" / "processed"
MODELS_DIR = ROOT / "models"

FORM_A = DATA_DIR / "form_a_provider_profiles.csv"
FORM_B = DATA_DIR / "form_b_provider_tasks.csv"
FORM_C = DATA_DIR / "form_c_completed_jobs.csv"

MODEL_PATH = MODELS_DIR / "best_duration_model.pkl"
METADATA_PATH = MODELS_DIR / "duration_model_metadata.json"
METRICS_PATH = MODELS_DIR / "duration_model_metrics.json"
TRAINING_DATA_PATH = PROCESSED_DIR / "duration_training_dataset.csv"

CATEGORICAL_FEATURES = [
    "service_category",
    "service_type",
    "task_name",
]

NUMERIC_FEATURES = [
    "years_experience",
    "task_frequency_per_month",
    "planned_team_size",
    "provider_estimated_duration_mins",
]

FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES
TARGET = "actual_duration_mins"
GROUP_KEY = "provider_id"
MODEL_VERSION = "duration-ridge-v1"


def _time_to_minutes(value):
    if pd.isna(value) or str(value).strip() == "":
        return np.nan
    parts = str(value).strip().split(":")
    return int(parts[0]) * 60 + int(parts[1])


def build_training_dataset() -> pd.DataFrame:
    form_a = pd.read_csv(FORM_A)
    form_b = pd.read_csv(FORM_B)
    form_c = pd.read_csv(FORM_C)

    form_a = form_a.rename(
        columns={
            "Q4. Research Participant Code (provider_id)": "provider_id",
            "Q5. Years of Experience (years_experience)": "years_experience",
        }
    )[["provider_id", "years_experience"]]

    form_b = form_b.rename(
        columns={
            "Q1. Research Participant Code (provider_id)": "provider_id",
            "Q2. Service Category": "service_category",
            "Q3. Service Type": "service_type",
            "Task Name": "task_name",
            "Q5. Typical Monthly Frequency (task_frequency_per_month)": "task_frequency_per_month",
            "Q7. Typical Duration in Mins (typical_mins)": "provider_typical_duration_mins",
        }
    )[
        [
            "provider_id",
            "service_category",
            "service_type",
            "task_name",
            "task_frequency_per_month",
            "provider_typical_duration_mins",
        ]
    ]

    form_c = form_c.rename(
        columns={
            "Q1. Research Participant Code (provider_id)": "provider_id",
            "Q4. Service Category": "service_category",
            "Q5. Service Type": "service_type",
            "Q6. Task Name": "task_name",
            "Q8. Duration Type": "duration_type",
            "Q9. Single Session Job?": "single_session_job",
            "Q12. Provider Estimated Duration (mins)": "provider_estimated_duration_mins",
            "Q13. Planned Team Size": "planned_team_size",
            "Q21. Actual Start Time": "actual_start_time",
            "Q22. Actual End Time": "actual_end_time",
        }
    )

    df = form_c.merge(form_a, on="provider_id", how="left")
    df = df.merge(
        form_b,
        on=["provider_id", "service_category", "service_type", "task_name"],
        how="left",
    )

    start = df["actual_start_time"].apply(_time_to_minutes)
    end = df["actual_end_time"].apply(_time_to_minutes)
    actual_duration = end - start
    actual_duration = actual_duration.where(actual_duration >= 0, actual_duration + 1440)
    df[TARGET] = actual_duration

    for col in NUMERIC_FEATURES + ["provider_typical_duration_mins"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df[
        (df["duration_type"] == "TASK_COMPLETION_BASED")
        & (df["single_session_job"] == "Yes")
        & df[TARGET].notna()
    ].copy()

    selected = [GROUP_KEY] + FEATURES + ["provider_typical_duration_mins", TARGET]
    df = df[selected]

    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    df.to_csv(TRAINING_DATA_PATH, index=False)
    return df


def build_pipeline() -> Pipeline:
    numeric_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical_pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_pipeline, NUMERIC_FEATURES),
            ("cat", categorical_pipeline, CATEGORICAL_FEATURES),
        ]
    )
    return Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("model", Ridge(alpha=1.0)),
        ]
    )


def regression_metrics(y_true, y_pred):
    return {
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "r2": float(r2_score(y_true, y_pred)),
    }


def main():
    df = build_training_dataset()
    X = df[FEATURES]
    y = df[TARGET]
    groups = df[GROUP_KEY]

    splitter = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=42)
    train_idx, test_idx = next(splitter.split(X, y, groups=groups))

    X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
    y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
    train_groups = groups.iloc[train_idx]
    test_groups = groups.iloc[test_idx]

    pipeline = build_pipeline()
    pipeline.fit(X_train, y_train)
    predictions = pipeline.predict(X_test)

    holdout = regression_metrics(y_test, predictions)

    # Baselines are evaluated separately; they are not inputs to the selected model.
    test_rows = df.iloc[test_idx]
    provider_estimate_baseline = regression_metrics(
        y_test, test_rows["provider_estimated_duration_mins"]
    )
    provider_typical_baseline = regression_metrics(
        y_test, test_rows["provider_typical_duration_mins"]
    )

    task_medians = df.iloc[train_idx].groupby("task_name")[TARGET].median()
    global_median = float(df.iloc[train_idx][TARGET].median())
    task_median_predictions = (
        test_rows["task_name"].map(task_medians).fillna(global_median)
    )
    task_median_baseline = regression_metrics(y_test, task_median_predictions)

    cv = GroupKFold(n_splits=5)
    cv_scores = cross_validate(
        build_pipeline(),
        X_train,
        y_train,
        groups=train_groups,
        cv=cv,
        scoring={
            "mae": "neg_mean_absolute_error",
            "rmse": "neg_root_mean_squared_error",
            "r2": "r2",
        },
    )

    metrics = {
        "model_version": MODEL_VERSION,
        "model": "Ridge Regression",
        "dataset_rows": int(len(df)),
        "unique_providers": int(df[GROUP_KEY].nunique()),
        "unique_tasks": int(df["task_name"].nunique()),
        "split": {
            "method": "GroupShuffleSplit",
            "test_size": 0.20,
            "random_state": 42,
            "train_rows": int(len(train_idx)),
            "test_rows": int(len(test_idx)),
            "train_providers": int(train_groups.nunique()),
            "test_providers": int(test_groups.nunique()),
            "provider_overlap": int(len(set(train_groups) & set(test_groups))),
        },
        "holdout": holdout,
        "baselines": {
            "provider_job_estimate": provider_estimate_baseline,
            "provider_typical_duration": provider_typical_baseline,
            "task_median": task_median_baseline,
        },
        "grouped_cv": {
            "folds": 5,
            "mae_mean": float(-cv_scores["test_mae"].mean()),
            "mae_std": float(cv_scores["test_mae"].std()),
            "rmse_mean": float(-cv_scores["test_rmse"].mean()),
            "r2_mean": float(cv_scores["test_r2"].mean()),
        },
    }

    metadata = {
        "model_version": MODEL_VERSION,
        "features": FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "numeric_features": NUMERIC_FEATURES,
        "target": TARGET,
        "group_key": GROUP_KEY,
        "purpose": "Calibrate a provider job-duration estimate using service/task/provider context.",
        "important_note": "This model is not a delay-risk classifier. Delay-aware coordination is deterministic in the Node coordination service.",
    }

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH)
    METRICS_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    print(json.dumps(metrics, indent=2))
    print(f"Saved model: {MODEL_PATH}")


if __name__ == "__main__":
    main()
