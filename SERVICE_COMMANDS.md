# Local Service Commands — macOS / zsh


Run each service in its own terminal. Open this file in Markdown Preview to view the tables.
Commands below assume you first set the repository path in EVERY new terminal:

```bash
export PROJECT_ROOT="/Users/chaveensewni/Downloads/Research 2026/Repo/R26-SE-020"
```

## 1. First-Time Setup Guide


Install Node.js/npm and Python suitable for the project's saved models.
Use the Python/scikit-learn versions used to train the saved models when available;
these commands install runtime dependencies and do not retrain or replace models.
For iOS Simulator testing, install Xcode and an iOS Simulator runtime.

### Configuration checklist

| Component | First-time configuration |
| --- | --- |
| Backend services | Configure their .env files with database credentials and service URLs. |
| Authentication | Services validating auth tokens must use the same JWT_SECRET and algorithm as authService. |
| MongoDB | Ensure the configured database is reachable and your connection is permitted. |
| Provider ML | Set MONGO_URI in Provider_Service/ML_Engine/.env; ensure saved model files exist in src/saved. predictor.py currently has a Windows MODEL_DIR path; configure the correct local model path before running on macOS. |
| Seeker text ML | Configure MONGO_URI and JWT_SECRET; the shared Seeker_Service/.env can be loaded by python-dotenv. |
| Seeker image classifier | Set MONGO_URI, JWT_SECRET, and ALGORITHM=HS256 in Seeker_Service/service-image-classifier/.env if HS256 matches authentication. |
| Frontends | Set their config.js LAN address to your Mac's current IP. Physical phones must reach the services on that address. |
| Expo Go | Provider uses SDK 57; seeker uses SDK 54. Use a matching Expo Go runtime, an iOS simulator, or a development build as appropriate. |
| Service URLs | Match the configured backend ports; seeker backend currently uses 6000. Provider ML uses 5000, text ML 5002, image classifier 8000, duration ML 8001. |

### Node.js services and frontends — install once

| Component | Setup command (after exporting PROJECT_ROOT above) |
| --- | --- |
| Authentication | `cd "$PROJECT_ROOT/authService" && npm install` |
| Provider backend | `cd "$PROJECT_ROOT/Provider_Service/Backend" && npm install` |
| Seeker backend | `cd "$PROJECT_ROOT/Seeker_Service" && npm install` |
| Coordination backend | `cd "$PROJECT_ROOT/ServiceCoordinationService" && npm install` |
| Admin backend | `cd "$PROJECT_ROOT/adminService" && npm install` |
| API Gateway | `cd "$PROJECT_ROOT/apiGateway" && npm install` |
| Seeker frontend | `cd "$PROJECT_ROOT/Frontend/Seeker_Mobile_App" && npm install` |
| Provider frontend | `cd "$PROJECT_ROOT/Frontend/ServiceProviderFrontend" && npm install` |
| Admin web frontend | `cd "$PROJECT_ROOT/Frontend/AdminWebApp" && npm install` |
| Coordination test app (optional) | `cd "$PROJECT_ROOT/Frontend/CoordinationTestApp" && npm install` |

### Python services — create environments and install once

Run one row at a time. Each service has its own .venv, except the optional image
API below, which shares the Seeker text ML environment.

| Component | Setup command (after exporting PROJECT_ROOT above) |
| --- | --- |
| Provider ML | `cd "$PROJECT_ROOT/Provider_Service/ML_Engine" && python3 -m venv .venv && source .venv/bin/activate && python -m pip install -r requirements.txt pymongo requests PyJWT certifi` |
| Seeker text ML | `cd "$PROJECT_ROOT/Seeker_Service/Ml_Service" && python3 -m venv .venv && source .venv/bin/activate && python -m pip install flask flask-cors requests certifi PyJWT python-dotenv pymongo joblib scikit-learn numpy deep-translator` |
| Seeker image classifier | `cd "$PROJECT_ROOT/Seeker_Service/service-image-classifier" && python3 -m venv .venv && source .venv/bin/activate && python -m pip install -r requirements.txt certifi` |
| Duration prediction ML | `cd "$PROJECT_ROOT/ServiceCoordinationService/DurationMLService" && python3 -m venv .venv && source .venv/bin/activate && python -m pip install -r requirements.txt certifi` |
| Optional legacy Seeker image API | After setting up Seeker text ML: `cd "$PROJECT_ROOT/Seeker_Service/Ml_Service" && source .venv/bin/activate && python -m pip install tensorflow pillow matplotlib flask-cors deep-translator` |

## 2. Start, Restart, And Stop


For a restart, press Ctrl+C in the existing service terminal first, then run the
row's start command. Do not reinstall packages for normal restarts.
If opening a new terminal, export PROJECT_ROOT again using the command above.

### Backend services

| Component | Start / restart command | Stop |
| --- | --- | --- |
| Authentication | `cd "$PROJECT_ROOT/authService" && npm start` | Ctrl+C in its terminal |
| Provider backend | `cd "$PROJECT_ROOT/Provider_Service/Backend" && npm start` | Ctrl+C in its terminal |
| Seeker backend | `cd "$PROJECT_ROOT/Seeker_Service" && npm start` | Ctrl+C in its terminal |
| Coordination backend | `cd "$PROJECT_ROOT/ServiceCoordinationService" && npm start` | Ctrl+C in its terminal |
| Admin backend | `cd "$PROJECT_ROOT/adminService" && npm start` | Ctrl+C in its terminal |
| API Gateway | `cd "$PROJECT_ROOT/apiGateway" && npm start` | Ctrl+C in its terminal |

### Python / ML services

Certificate setup: after activating .venv in EACH Python service terminal, run:

```bash
export SSL_CERT_FILE="$(python -m certifi)"
export REQUESTS_CA_BUNDLE="$SSL_CERT_FILE"
```

Then run the command in the Start / restart command column. These environment variables
supply trusted certificates at runtime without changing application or model code.

| Component | Folder / activate environment | Start / restart command | Stop |
| --- | --- | --- | --- |
| Provider ML (5000) | `cd "$PROJECT_ROOT/Provider_Service/ML_Engine" && source .venv/bin/activate` | `python src/app.py` | Ctrl+C in its terminal |
| Seeker text ML (5002) | `cd "$PROJECT_ROOT/Seeker_Service/Ml_Service" && source .venv/bin/activate` | `python -m text_service.text_api` | Ctrl+C in its terminal |
| Seeker image classifier (8000) | `cd "$PROJECT_ROOT/Seeker_Service/service-image-classifier" && source .venv/bin/activate` | `python -m uvicorn app:app --app-dir src --env-file .env --host 0.0.0.0 --port 8000` | Ctrl+C in its terminal |
| Duration prediction ML (8001) | `cd "$PROJECT_ROOT/ServiceCoordinationService/DurationMLService" && source .venv/bin/activate` | `python -m uvicorn src.app:app --host 0.0.0.0 --port 8001 --reload` | Ctrl+C in its terminal |
| Optional legacy image API (5003) | `cd "$PROJECT_ROOT/Seeker_Service/Ml_Service" && source .venv/bin/activate` | `python -c 'import sys, runpy; sys.path.insert(0, "api"); runpy.run_path("api/app.py")["app"].run(host="0.0.0.0", port=5003, debug=False)'` | Ctrl+C in its terminal |

The optional legacy image API is separate from the classifier on 8000. Only run
it if your configuration uses it. Its normal entry point hardcodes port 5000;
the command above selects 5003 at launch to avoid conflicting with Provider ML.
After stopping a Python service, use `deactivate` to leave its environment.

### Frontends

| Component | Start / restart command | Stop |
| --- | --- | --- |
| Seeker frontend | `cd "$PROJECT_ROOT/Frontend/Seeker_Mobile_App" && npx expo start --clear --port 8081` | Ctrl+C in its terminal |
| Provider frontend | `cd "$PROJECT_ROOT/Frontend/ServiceProviderFrontend" && npx expo start --clear --port 8082` | Ctrl+C in its terminal |
| Admin web frontend | `cd "$PROJECT_ROOT/Frontend/AdminWebApp" && npm run dev` | Ctrl+C in its terminal |
| Coordination test app (optional) | `cd "$PROJECT_ROOT/Frontend/CoordinationTestApp" && npx expo start --clear --port 8083` | Ctrl+C in its terminal |

Expo controls: press w for web, i for iOS Simulator, or scan the QR code using a
compatible Expo Go runtime. Restart Metro after changing SDK dependencies.
Provider and seeker use different Metro ports so both can run together.

### Useful checks

| Service | Check |
| --- | --- |
| Image classifier | http://localhost:8000/docs |
| Duration ML | http://localhost:8001/health |
| Seeker frontend web | http://localhost:8081 (press w in its Expo terminal first) |
| Provider frontend web | http://localhost:8082 (press w in its Expo terminal first) |
| Occupied port | `lsof -nP -iTCP:8082 -sTCP:LISTEN` (replace 8082 with the affected port); stop the existing service in its terminal. |

Start authentication, required ML services, and backends before testing frontend
features. Provider_Service itself has no npm start script; use its Backend folder.
Backend ports not listed here come from their own code and .env settings.
