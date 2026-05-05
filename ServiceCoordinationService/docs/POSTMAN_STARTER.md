# Postman Starter

## Health
GET http://localhost:5005/health

## Create Service Request With ML Predictions
POST http://localhost:5005/api/coordination/service-requests

```json
{
  "customerId": "CUS001",
  "serviceCategory": "Repairing Services",
  "serviceSubCategory": "Plumbing",
  "description": "Water tank pipe leaking",
  "district": "Colombo",
  "address": "Nugegoda",
  "preferredStartTime": "2026-05-10T10:00:00.000Z",
  "taskComplexity": "Medium",
  "weatherAffected": "No",
  "providerScheduleDensity": "High",
  "distanceKm": 8.5,
  "estimatedTravelTimeMins": 25,
  "gapBeforeNextBookingMins": 30,
  "startDelayMins": 20
}
```
