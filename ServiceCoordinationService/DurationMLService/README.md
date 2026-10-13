# Service Duration Prediction ML Service

Final duration-prediction service for the Delay-Aware Scheduling research component.

## Final responsibility

This service predicts duration for `TASK_COMPLETION_BASED` jobs only. It does **not** predict delay risk and it does **not** require a seeker/provider manual duration estimate.

Delay-aware schedule feasibility is handled by the Node.js Coordination Service using the predicted duration, provider availability, existing bookings, routing-derived travel time, and scheduling buffers.

## First Run

```bash
cd ~/DurationMLService
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn src.app:app --reload --host 0.0.0.0 --port 8001
```

## Run

```bash
pip install -r requirements.txt
uvicorn src.app:app --host 0.0.0.0 --port 8001 --reload
```

## Health

```http
GET /health
```

## Predict duration

```http
POST /predict-duration
Content-Type: application/json
```

Example request:

```json
{
  "serviceCategory": "Repairing",
  "serviceType": "Electrical Repair",
  "taskName": "Install Ceiling Fan",
  "yearsExperience": 5,
  "taskFrequencyPerMonth": 8,
  "plannedTeamSize": 1
}
```

Example response:

```json
{
  "predictedDurationMins": 77,
  "predictedDurationHours": 1.28,
  "modelVersion": "duration-v2-no-manual-estimate",
  "modelName": "Ridge",
  "inputCompleteness": {
    "optionalFieldsProvided": 3,
    "optionalFieldsTotal": 3
  },
  "source": "TRAINED_DURATION_MODEL"
}
```

## Model inputs

- `service_category`
- `service_type`
- `task_name`
- `years_experience`
- `task_frequency_per_month`
- `planned_team_size`

Target: `actual_duration_mins`.

The grouped holdout split contains no provider overlap between training and test providers.
