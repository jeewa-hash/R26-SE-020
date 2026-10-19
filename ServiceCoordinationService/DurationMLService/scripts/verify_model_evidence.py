"""Reproduce provider-disjoint evaluation without replacing deployed model assets."""
import hashlib
import json
import platform
import sys
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.model_selection import GroupShuffleSplit, GroupKFold, cross_validate
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from src.train_duration_model import build_pipeline, FEATURES, TARGET, GROUP_KEY


def metrics(actual, predicted):
    return {'MAE_minutes': float(mean_absolute_error(actual, predicted)),
            'RMSE_minutes': float(np.sqrt(mean_squared_error(actual, predicted))),
            'R2': float(r2_score(actual, predicted))}


def main():
    dataset = ROOT / 'data/processed/duration_training_dataset.csv'
    model_path = ROOT / 'models/best_duration_model.pkl'
    df = pd.read_csv(dataset)
    assert 'provider_estimated_duration_mins' not in FEATURES
    assert 'provider_typical_duration_mins' not in FEATURES
    X, y, groups = df[FEATURES], df[TARGET], df[GROUP_KEY]
    train, test = next(GroupShuffleSplit(n_splits=1, test_size=.2, random_state=42).split(X, y, groups))
    overlap = set(groups.iloc[train]) & set(groups.iloc[test])
    assert not overlap, 'Provider leakage between training and test sets'
    model = build_pipeline().fit(X.iloc[train], y.iloc[train])
    predictions = model.predict(X.iloc[test])
    medians = df.iloc[train].groupby('task_name')[TARGET].median()
    baseline = X.iloc[test].task_name.map(medians).fillna(y.iloc[train].median()).to_numpy()
    cv = cross_validate(build_pipeline(), X, y, groups=groups, cv=GroupKFold(5), scoring={'mae':'neg_mean_absolute_error','r2':'r2'})
    deployed = joblib.load(model_path)
    deployed_predictions = deployed.predict(X.iloc[test])
    result = {
        'target': TARGET, 'model': 'Ridge regression', 'features': FEATURES,
        'manual_duration_inputs_used': False,
        'split': {'method':'GroupShuffleSplit', 'random_state':42, 'train_rows':len(train), 'test_rows':len(test), 'train_providers':int(groups.iloc[train].nunique()), 'test_providers':int(groups.iloc[test].nunique()), 'provider_overlap':len(overlap)},
        'reproduced_holdout':metrics(y.iloc[test],predictions), 'task_median_baseline':metrics(y.iloc[test],baseline),
        'saved_model_replay':metrics(y.iloc[test],deployed_predictions),
        'saved_model_matches_reproduced_predictions':bool(np.allclose(predictions,deployed_predictions)),
        'grouped_cv':{'folds':5,'MAE_minutes_mean':float(-cv['test_mae'].mean()),'MAE_minutes_std':float(cv['test_mae'].std()),'R2_mean':float(cv['test_r2'].mean())},
        'fingerprints':{'dataset_sha256':hashlib.sha256(dataset.read_bytes()).hexdigest(),'saved_model_sha256':hashlib.sha256(model_path.read_bytes()).hexdigest()},
        'environment':{'python':platform.python_version(),'sklearn':sklearn.__version__},
        'limitations':['Dataset collection provenance has not been independently verified.', 'Holdout measures this dataset, not guaranteed production accuracy.', 'R2 is not an accuracy percentage.', 'Saved-model replay is not independent evaluation unless its training split is confirmed; compare the reproduction match.', 'Task median may outperform Ridge and must be shown.', 'Live missing values and unseen categories can reduce reliability.'],
    }
    out = ROOT / 'reports/presentation'; out.mkdir(parents=True,exist_ok=True)
    (out/'evaluation_evidence.json').write_text(json.dumps(result,indent=2))
    rows = df.iloc[test][[GROUP_KEY]+FEATURES+[TARGET]].copy()
    rows['predicted_duration_mins']=predictions
    rows['absolute_error_mins']=np.abs(y.iloc[test].to_numpy()-predictions)
    rows['task_median_prediction_mins']=baseline
    rows.to_csv(out/'heldout_evidence.csv',index=False)
    m,b = result['reproduced_holdout'],result['task_median_baseline']
    report = f'''# Ridge model presentation evidence

The model predicts **task duration in minutes**, not delay probability. The coordination engine uses duration + availability + bookings + travel + buffer to decide schedule feasibility.

## Reproducible evaluation

- Dataset: {len(df)} rows; {groups.nunique()} providers.
- Holdout: {len(test)} rows from {groups.iloc[test].nunique()} providers. Training/test provider overlap: **0**.
- Ridge MAE: **{m['MAE_minutes']:.2f} minutes**; RMSE: **{m['RMSE_minutes']:.2f} minutes**; R²: **{m['R2']:.4f}**.
- Task-median baseline MAE: **{b['MAE_minutes']:.2f} minutes**; R²: **{b['R2']:.4f}**.
- Saved artifact reproduces this fit: **{result['saved_model_matches_reproduced_predictions']}**.

Show `heldout_evidence.csv` for actual versus predicted durations and per-job errors. Cite the environment and SHA-256 fingerprints in `evaluation_evidence.json`. No deployed model assets were replaced.

## Live demonstration

1. Use a real service category, service type and canonical task. Avoid using an entire post title as a task label.
2. In the provider quotation form, enter relevant experience, task frequency and planned team size. These are provider-declared values, not independently verified facts.
3. Send/recheck the quotation and expand **Duration estimate** in provider Quotation Details.
4. Show the captured input payload, effective inputs, imputed fields, unseen categories, Ridge version and prediction.
5. Show predicted minutes plus buffer and the resulting schedule window. Travel feasibility is a separate deterministic calculation.
6. If the result says reference fallback, do not present it as an ML prediction. Historical quotations without evidence need a new check; evidence is not invented retrospectively.

## Limits to state clearly

R² is not an accuracy percentage. This evaluation does not prove every incoming input is correct, establish field-trial accuracy, or independently verify dataset provenance. Compare the baseline honestly; a higher Ridge error means it did not outperform that baseline. Production monitoring should compare predicted minutes with actual completed-job duration using actual start/end timestamps.
'''
    (out/'PRESENTATION_EVIDENCE.md').write_text(report)
    print(json.dumps({'holdout':m,'baseline':b,'saved_model_match':result['saved_model_matches_reproduced_predictions'],'report':str(out/'PRESENTATION_EVIDENCE.md')},indent=2))

if __name__ == '__main__': main()
