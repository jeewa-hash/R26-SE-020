# Local viva setup

This branch runs the coordination flow locally: auth, seeker, provider, coordination, the saved Ridge duration model, and both mobile apps in web browsers. The seeker backend uses **6000**. Admin app/service files and production deployments are unchanged.

Internet is still needed for the databases already configured in the ignored backend .env files, Google routing, and hosted components such as photo/text diagnosis and provider matching. This does not create an offline database or isolate existing data. Use your own demo accounts and fresh posts; setup does not seed, delete, or reset accounts/jobs/payments.

## Start on this laptop

From the repository root:

```sh
python3 scripts/start-viva-demo.py
```

It detects the macOS Wi-Fi IP, sets local connections and matching notification/JWT/reward service keys, starts five backends/model services, opens two Metro web servers, and checks readiness. To choose the laptop address explicitly:

```sh
python3 scripts/start-viva-demo.py --host 192.168.8.100
```

Use the current IP, not an old address after changing Wi-Fi. The script stops/restarts only processes whose port and working directory match this checkout; occupied ports belonging to another application cause it to stop safely. Logs and process IDs remain under ignored `.local-build/local-services/`. Secrets are not printed or committed. The local notification key is separate from the production publishing key.

| Component | Address |
| --- | --- |
| Provider app | http://localhost:8082 |
| Seeker app | http://localhost:8083 |
| Auth | http://localhost:4003 |
| Seeker backend | http://localhost:6000 |
| Provider backend | http://localhost:3002 |
| Coordination | http://localhost:5010 |
| Ridge model | http://localhost:8001 |

Open provider and seeker in separate browser windows, optionally using the browser's mobile viewport. Sign out and back in to both apps so their tokens come from local auth. Existing installed production APKs continue using their bundled production endpoints.

For a phone demonstration, keep it on the same Wi-Fi and run `python3 scripts/start-viva-demo.py --no-web`, then start Expo manually in each frontend folder with `npx expo start --clear`. The current seeker project uses SDK 57 and the provider project SDK 54; each native client must match its app's SDK. The two browser apps avoid that native-client mismatch.

## Viva walkthrough

1. Log in as your demo seeker/provider in their respective windows.
2. Set the provider available on today's weekday, with working hours covering the proposed start plus predicted duration and the 15-minute scheduling buffer. Avoid existing bookings and the daily booking limit.
3. Create a fresh seeker post (or use your search/provider-ad entry point). Show the service category/task carried into the request.
4. Provider: respond **I'm available**. Seeker: show the live banner, inbox row and its link to this post. A repeated response by the same provider to the same post is intentionally deduplicated; use a fresh post for each demonstration.
5. Seeker: request a quotation. Provider: show the notification, open the request, enter a price and confirm team size. Category/task, experience when recorded, and completed-task history are gathered automatically; missing values stay identified in the model evidence.
6. For the live start demonstration, choose a start approximately 5–10 minutes ahead, within the provider's working hours and free schedule. This fits the 15-minute early-start window. Review the quotation, Ridge evidence, availability/travel result and 15-minute buffer, then confirm through My Services.
7. Provider: confirm readiness, mark **I'm On My Way**, then start work. Travel has no early-time restriction for confirmed/rescheduled jobs. Starting opens 15 minutes early; unstarted services expire after the existing 45-minute late window.
8. Seeker: show the live travel/start state in My Services and its notification links. For a separate reschedule demonstration, propose a future time before work starts and have the provider review/approve it.
9. Provider: complete the demo service. Show its history/activity and the unchanged agreed amount in earnings.
10. If demonstrating the added points-payment option, use a demo account with an existing balance: 1 point = LKR 1. Confirm payment details, show the reduced customer amount and full agreed provider earnings, then record provider receipt of cash/bank payment. The platform-funded portion remains owed by the platform; this does not execute a payout. The original rewards/admin redemption flow remains separate.

Use demo records explicitly for the presentation. Completing a demo job records a completion and can affect that provider's subsequent 30-day platform task-frequency input.

## Readiness and model evidence

Run anytime without restarting services:

```sh
python3 scripts/check-local-demo.py --web
```

It checks the real local Mongo connections, shared local configuration, notification workers and socket readiness, the coordination task catalogue, both Metro servers, and a real prediction from the saved Ridge model. It creates no account notifications or jobs. Its sample model input is a catalogue task with fixed numeric demonstration values; it is not presented as a particular provider's observed data.

The latest input/output evidence is saved to `.local-build/viva/last-check.json`. This confirms operational inference, not predictive accuracy. For held-out accuracy and limitations use `ServiceCoordinationService/DurationMLService/reports/presentation/PRESENTATION_EVIDENCE.md`. Ridge predicts task duration; schedule conflict/travel validation is handled separately by coordination.

If a check fails, inspect the corresponding private log under `.local-build/local-services/` without sharing credentials. If quotation validation fails, check that coordination can reach seeker:6000, provider:3002 and model:8001. If a new notification is absent, check the protected notification health/queue results, correct recipient account, and that this provider/post response is new.

## Stop or return to hosted services

```sh
python3 scripts/stop-local-services.py
python3 scripts/setup-production-environment.py
```

Restart Expo after switching configuration. Changing Git branches alone does not reset ignored .env/.env.local files, so use the setup script appropriate to the environment. These commands do not deploy hosted code or modify Render/Railway dashboards.

## A fresh machine

Supply the existing backend .env credentials privately; do not commit them. Install each Node service/frontend's dependencies using its lockfile. The duration service needs its `.venv`, dependencies from `requirements.txt` (scikit-learn 1.8.0) and the existing `models/best_duration_model.pkl` artifact. The model file is present on this laptop but ignored by Git, so a fresh checkout must obtain the same saved artifact privately; no retraining or substitute predictions are performed by setup.
