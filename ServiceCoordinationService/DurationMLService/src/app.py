# Predict job duration for delay-aware scheduling. The Node.js Coordination Service
# uses this prediction and applies separate schedule/travel feasibility rules.

from __future__ import annotations

# Standard library helpers for JSON files, file paths, and optional input types.
import json
from pathlib import Path
from typing import Optional

# Load the saved ML pipeline, prepare tabular inputs, and define the validated API.
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# Locate the DurationMLService folder and the artifacts produced during training.
ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "models" / "best_duration_model.pkl"
METADATA_PATH = ROOT / "models" / "duration_model_metadata.json"
METRICS_PATH = ROOT / "models" / "duration_model_metrics.json"

# Create the HTTP API and describe its role in the scheduling system.
app = FastAPI(
    title="Service Duration Prediction ML Service",
    description=(
        "Predicts task-completion service duration automatically from pre-job context. "
        "Delay-aware schedule feasibility is handled deterministically by the Coordination Service."
    ),
    version="2.1.0",
)

# Keep loaded assets in memory so requests do not reload files from disk.
model = None
metadata = {}
metrics = {}
task_catalog = []


# Validate incoming prediction requests before they reach the prediction function.
class DurationPredictionRequest(BaseModel):
    # These three task identifiers are required and cannot be empty strings.
    serviceCategory: str = Field(min_length=1)
    serviceType: str = Field(min_length=1)
    taskName: str = Field(min_length=1)

    # Provider context is optional. Experience/frequency cannot be negative;
    # team size must be positive. Missing values use the pipeline's trained medians.
    yearsExperience: Optional[float] = Field(default=None, ge=0)
    taskFrequencyPerMonth: Optional[float] = Field(default=None, ge=0)
    plannedTeamSize: Optional[float] = Field(default=None, gt=0)


# Load the trained pipeline and supporting information once when the API starts.
@app.on_event("startup")
def load_assets():
    global model, metadata, metrics, task_catalog

    # The saved pipeline contains both preprocessing and the regression model.
    model = joblib.load(MODEL_PATH) if MODEL_PATH.exists() else None
    # Metadata describes the model; metrics contain its saved evaluation results.
    metadata = (
        json.loads(METADATA_PATH.read_text(encoding="utf-8"))
        if METADATA_PATH.exists()
        else {}
    )
    metrics = (
        json.loads(METRICS_PATH.read_text(encoding="utf-8"))
        if METRICS_PATH.exists()
        else {}
    )

    # Build a sorted catalog of unique category/type/task combinations.
    dataset_path = ROOT / "data" / "processed" / "duration_training_dataset.csv"
    task_catalog = pd.read_csv(dataset_path)[["service_category", "service_type", "task_name"]].drop_duplicates().sort_values(["service_category", "service_type", "task_name"]).to_dict("records") if dataset_path.exists() else []


# Report API status and whether the prediction model was successfully loaded.
@app.get("/health")
def health_check():
    return {
        "service": "Service Duration Prediction ML Service",
        "status": "healthy",
        "modelLoaded": model is not None,
        "modelVersion": metadata.get("model_version"),
        "manualDurationInputRequired": False,
    }


# Expose model details, saved evaluation metrics, and the available task catalog.
@app.get("/model-info")
def model_info():
    return {
        "metadata": metadata,
        "metrics": metrics,
        "taskCatalog": task_catalog,
    }


# Accept job context and return an estimated completion duration with evidence.
@app.post("/predict-duration")
def predict_duration(request: DurationPredictionRequest):
    # A prediction cannot run without the saved pipeline: return HTTP 503.
    if model is None:
        raise HTTPException(status_code=503, detail="Duration model is not loaded")

    # Map API field names to the exact feature names used during training.
    # One request becomes one DataFrame row; strip whitespace from task labels.
    input_data = pd.DataFrame(
        [
            {
                "service_category": request.serviceCategory.strip(),
                "service_type": request.serviceType.strip(),
                "task_name": request.taskName.strip(),
                "years_experience": request.yearsExperience,
                "task_frequency_per_month": request.taskFrequencyPerMonth,
                "planned_team_size": request.plannedTeamSize,
            }
        ]
    )

    # Apply saved imputers, scaling, and one-hot encoding, then Ridge regression.
    # Select the first (only) row's predicted duration in minutes.
    try:
        prediction = float(model.predict(input_data)[0])
    # Convert prediction failures into an HTTP 422 response with an error message.
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Unable to generate duration prediction: {exc}",
        ) from exc

    # Preserve the original output so callers can see whether a minimum was applied.
    raw_prediction = prediction

    # A negative/near-zero regression output is not a meaningful service duration.
    prediction = max(1.0, prediction)
    rounded_prediction = int(round(prediction))

    # Count how many optional provider inputs were supplied; this is completeness,
    # not a statistical confidence score for the prediction.
    optional_fields = {
        "yearsExperience": request.yearaaqqqzZzsExperience,
        "taskFrequencyPerMonth": request.taskFrequencyPerMonth,
        "plannedTeamSize": request.plannedTeamSize,
    }
    supplied_optional = sum(value is not None for value in optional_fields.values())

    # Read the numeric medians learned during training for prediction evidence.
    preprocessor = model.named_steps["preprocessor"]
    num_pipeline = preprocessor.named_transformers_["num"]
    numeric_columns = list(preprocessor.transformers_[0][2])
    medians = dict(zip(numeric_columns, num_pipeline.named_steps["imputer"].statistics_))
    # Find submitted categories absent from training; the encoder ignores them.
    categorical_steps = preprocessor.named_transformers_["cat"].named_steps
    encoder = categorical_steps.get("onehot", categorical_steps.get("encoder"))
    categorical_columns = list(preprocessor.transformers_[1][2])
    unseen = [column for column, categories in zip(categorical_columns, encoder.categories_)
              if input_data.iloc[0][column] not in categories]
    # Show original inputs and inputs after median filling, before scaling/encoding.
    # List imputed fields so filled values are distinguishable from supplied data.
    submitted = input_data.iloc[0].to_dict()
    effective = {key: (float(medians[key]) if value is None or pd.isna(value) else value)
                 for key, value in submitted.items()}
    imputed = [key for key in numeric_columns if submitted[key] is None or pd.isna(submitted[key])]

    # Return duration in minutes/hours, model identity, and an audit of the inputs.
    # Node.js uses the duration for scheduling and evaluates delay feasibility there.
    return {
        "predictedDurationMins": rounded_prediction,
        "predictedDurationHours": round(rounded_prediction / 60.0, 2),
        "modelVersion": metadata.get("model_version", "duration-v2-no-manual-estimate"),
        "modelName": metadata.get("model_name", metrics.get("model", "Ridge")),
        "inputCompleteness": {
            "optionalFieldsProvided": supplied_optional,
            "optionalFieldsTotal": len(optional_fields),
        },
        "source": "TRAINED_DURATION_MODEL",
        "evidence": {
            "submittedInputs": submitted,
            "effectiveInputs": effective,
            "imputedFields": imputed,
            "unseenCategories": unseen,
            "rawPredictionMins": raw_prediction,
            "minimumDurationApplied": raw_prediction < 1,
            "predictionTarget": "actual_duration_mins",
            "note": "Duration prediction, not a delay-risk probability. Missing numeric values use training medians; unseen categorical values are ignored by the encoder.",
        },
    }
