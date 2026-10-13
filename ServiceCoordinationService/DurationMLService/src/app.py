from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "models" / "best_duration_model.pkl"
METADATA_PATH = ROOT / "models" / "duration_model_metadata.json"
METRICS_PATH = ROOT / "models" / "duration_model_metrics.json"

app = FastAPI(
    title="Service Duration Prediction ML Service",
    description=(
        "Predicts task-completion service duration automatically from pre-job context. "
        "Delay-aware schedule feasibility is handled deterministically by the Coordination Service."
    ),
    version="2.1.0",
)

model = None
metadata = {}
metrics = {}


class DurationPredictionRequest(BaseModel):
    serviceCategory: str = Field(min_length=1)
    serviceType: str = Field(min_length=1)
    taskName: str = Field(min_length=1)

    yearsExperience: Optional[float] = Field(default=None, ge=0)
    taskFrequencyPerMonth: Optional[float] = Field(default=None, ge=0)
    plannedTeamSize: Optional[float] = Field(default=None, gt=0)


@app.on_event("startup")
def load_assets():
    global model, metadata, metrics

    model = joblib.load(MODEL_PATH) if MODEL_PATH.exists() else None
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


@app.get("/health")
def health_check():
    return {
        "service": "Service Duration Prediction ML Service",
        "status": "healthy",
        "modelLoaded": model is not None,
        "modelVersion": metadata.get("model_version"),
        "manualDurationInputRequired": False,
    }


@app.get("/model-info")
def model_info():
    return {
        "metadata": metadata,
        "metrics": metrics,
    }


@app.post("/predict-duration")
def predict_duration(request: DurationPredictionRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Duration model is not loaded")

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

    try:
        prediction = float(model.predict(input_data)[0])
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Unable to generate duration prediction: {exc}",
        ) from exc

    # A negative/near-zero regression output is not a meaningful service duration.
    prediction = max(1.0, prediction)
    rounded_prediction = int(round(prediction))

    optional_fields = {
        "yearsExperience": request.yearsExperience,
        "taskFrequencyPerMonth": request.taskFrequencyPerMonth,
        "plannedTeamSize": request.plannedTeamSize,
    }
    supplied_optional = sum(value is not None for value in optional_fields.values())

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
    }
