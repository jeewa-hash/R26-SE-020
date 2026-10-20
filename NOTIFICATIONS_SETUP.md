# Production job-flow notifications

## Verified production blocker

The latest read-only checks returned **404** for auth `/internal/notifications/health`, seeker `/health/notifications`, and provider `/health/notifications`. An intentionally invalid empty POST to auth `/internal/notifications` also returned **404**, confirming that the hosted auth service at the configured URL does not currently expose the notification publisher. No account notification was created by that probe.

The notification fixes are committed on branch **IT22129376-DurationML-Migration**. Switching mobile URLs or configuring a secret cannot install backend code. In the hosting dashboards:

1. **Render auth service:** check its connected repository, deploy branch, and root directory (`authService`). Deploy the latest commit containing the notification routes from the branch above, or merge those fixes into the configured deployment branch first. Use the existing production database/JWT configuration and set the shared NOTIFICATION_SERVICE_SECRET.
2. **Railway seeker service:** check the source branch and root (`Seeker_Service`), set PORT=6000, set AUTH_SERVICE_URL=https://r26-auth-service.onrender.com and the same shared secret, then redeploy the updated code.
3. **Railway provider service:** check the source branch and root (`Provider_Service/Backend`), set the same auth URL and secret, then redeploy the updated code.
4. **EKS coordination:** the notification URL and secret reference have been applied already; deploy the updated coordination image to install the retry worker and protected health route. Environment configuration does not update the image's source code.
5. Rerun the protected diagnostics below. Each health endpoint must respond successfully before testing a new provider response in the apps. Restart Expo after environment changes and re-login to production auth.

Render/Railway management is not connected to this workspace, so their source settings and environment variables must be changed by an account with hosting access. Admin app/service configuration is unchanged.

## Production requirements

All four backends must have the **same server-only NOTIFICATION_SERVICE_SECRET**:

| Service | Hosting | Configuration |
| --- | --- | --- |
| authService | Render | NOTIFICATION_SERVICE_SECRET |
| Seeker_Service | Railway | NOTIFICATION_SERVICE_SECRET and AUTH_SERVICE_URL=https://r26-auth-service.onrender.com |
| Provider_Service/Backend | Railway | Same two variables |
| ServiceCoordinationService | EKS | AUTH_SERVICE_URL and coordination-secrets/NOTIFICATION_SERVICE_SECRET |

Do not put this secret in EXPO_PUBLIC variables, EAS app configuration, Git, or chat. A private configuration file is prepared at `.local-build/production-notifications.env` (ignored by Git, permissions 0600). Enter its values in the corresponding hosting dashboards, then restart/redeploy those services. Do not create different secrets per service.

The mobile configs and EAS production profiles already default to the hosted auth/seeker/provider/coordination origins. Expo loads EXPO_PUBLIC variables from local environment files too: remove stale localhost overrides or set them to the deployed origins, then restart Metro with `npx expo start --clear`. A JWT from another auth environment will fail both inbox and socket authentication; re-login against the deployed auth service.

Production check on 20 October 2026: the hosted auth/socket, seeker and provider endpoints are reachable. The coordination deployment had no notification origin, secret reference or inherited environment configuration, and its secret lacked the notification key. Those EKS settings have now been applied and the rollout completed; Render/Railway configuration and deployment of the new application code still remain.

The EKS manifest now declares the auth origin and notification secret reference. `python3 scripts/configure-coordination-notifications.py` applies only those EKS settings from the private file, preserving existing deployment settings and secret keys. It does not deploy application code, configure Render/Railway, or send notifications.

## Delivery and recovery

Both apps use authService as the persistent inbox and authenticated Socket.IO hub. The provider-interest event goes to the seeker who owns the post; quotation requests go to the provider; sent quotes go to the seeker; lifecycle and reschedule events go to their participants. Banners and inbox links open the relevant My Services/My Jobs detail screen. These are foreground/in-app notifications; remote background push is not implemented.

The three sender services persist lifecycle events in `lifecyclenotificationoutboxes` before attempting delivery. Workers start after Mongo connects, attempt delivery immediately and every ten seconds, use leases for multiple process safety, and back off up to five minutes for network/HTTP failures. Missing credentials and 401 responses retain pending events rather than dropping them. Invalid payloads (400/413) remain FAILED for investigation. Delivered outbox entries expire after seven days; pending/failed entries are not automatically deleted.

Auth stores each event once using its stable eventId, then emits it only to the authenticated recipient's room. Ensure sparse unique eventId indexes exist on SeekerNotification and ProviderNotification. Auth should run as one Socket.IO hub instance unless a shared Socket.IO adapter is configured; REST polling still recovers persisted events when sockets are unavailable.

This queue is a durable handoff once written, not a transaction spanning the original business document and the queue. A failure to write the queue is logged and does not undo an already saved business action. Events dropped by older deployments cannot be reconstructed automatically by this change.

Scheduled-start reminders keep their separate booking-aware retry worker; they are revalidated before delivery so an old appointment reminder cannot be sent after work starts or the appointment changes. Travel can be reported at any time for a confirmed/rescheduled service. Start is allowed from 15 minutes before through 45 minutes after the scheduled start. Unstarted services expire after that window and can request provider-approved rescheduling from My Services. Existing admin penalties and separate seeker Bookings screens are unchanged.

The mobile socket starts with polling and can upgrade to WebSocket. Each inbox source gets a silent initial baseline; later unseen events show once. Neither phone clock differences nor failure of the quotations/admin API should suppress the other source. Reconnecting fetches missed events; failed fetches retain current unread information. Swipe-up or close dismisses a banner without opening or marking it read. Old unread history stays accessible without being replayed as new popups at login.

## Deployment verification

Deploy the new auth, seeker, provider and coordination code as well as configuring the variables; changing environment variables alone does not install the new retry worker. Rebuild the apps or reload their updated Expo bundles.

Each sender exposes GET /health/notifications; auth exposes GET /internal/notifications/health. Supply x-notification-secret. These endpoints return readiness/queue counts only and never reveal the secret. A 404 means that deployment has not installed the diagnostic route; 401 means the supplied secret differs; 503 means configuration or dependencies are not ready.

Run read-only production checks with the private environment loaded:

```sh
# In another terminal, while coordination uses an HTTP-only public endpoint:
# kubectl port-forward service/coordination-service 5010:5010
COORDINATION_SERVICE_URL=http://127.0.0.1:5010 node --env-file=.local-build/production-notifications.env scripts/check-production-notifications.mjs
```

The diagnostic script refuses to send the shared secret to a public HTTP-only endpoint; use HTTPS or the local Kubernetes port-forward. This does not create notifications or modify accounts. All four services must report healthy; FAILED outbox records need investigation. A successful socket handshake alone proves transport connectivity, not that publishers have configured credentials.

With the seeker and provider apps open and signed into matching production accounts, use a NEW provider response on a seeker-owned post. Verify an immediate banner, unread badge, persisted inbox row and exact post response link. Repeating the same response for the same provider/post is intentionally deduplicated. Then request and send a quotation and exercise booking readiness, travel, start, delay, reschedule and completion. Disconnect/reconnect to verify recovery without historical popup replay. Dismiss without opening and verify the notification stays unread.

Automated checks:

```sh
node --test authService/test/lifecycleNotifications.test.cjs authService/test/lifecycleTransport.test.cjs authService/test/notificationOutbox.test.cjs Frontend/Seeker_Mobile_App/tests/*.test.cjs Frontend/ServiceProviderFrontend/tests/*.test.cjs
```

These use local sockets and test doubles and do not send production account notifications. A Mongo-backed deployment and physical devices still need the production walkthrough above.

## Current environment

This `local-setup` branch is configured for the viva: auth 4003, seeker **6000**, provider 3002, coordination 5010 and Ridge model 8001. Both apps use ignored local overrides with the current laptop LAN address. See [VIVA_LOCAL_SETUP.md](VIVA_LOCAL_SETUP.md) for the one-command launcher, browser URLs, complete presentation walkthrough, readiness checks and return-to-production command.

Production URL defaults and EAS production profiles remain intact. Git branch switching does not reset ignored environment files; run the appropriate environment setup script when switching.

## Local development

The optional local test setup uses auth `4003`, seeker `6000`, provider `3002`, coordination `5010`, and duration ML `8001`. Running the local setup script creates ignored `.env.local` overrides using the supplied laptop LAN IP; tracked deployed defaults and EAS production profiles remain unchanged.

To configure this again (or after a Wi-Fi/IP change), run:

```sh
python3 scripts/setup-local-notifications.py --host 192.168.8.101
python3 scripts/start-local-services.py
```

The setup script aligns the local notification/JWT configuration without printing secrets. The start script verifies port owners belong to this checkout before restarting only the four backend services; it also stops the old seeker listener on 6001. Local process IDs and logs are stored under ignored `.local-build/local-services/`. It does not restart or reconfigure the duration model, admin service, or hosted services. Databases remain those already configured in the local `.env` files.

Restart Expo with `npx expo start --clear` in each app folder and sign out/in so the token comes from local auth. Use a provider response on a new post to verify the seeker receives the foreground banner and persisted inbox entry.

Keep the same server-only secret across the four local services and set AUTH_SERVICE_URL to a reachable local auth origin. Mobile EXPO_PUBLIC_AUTH_SERVICE_URL must use the laptop's LAN address for physical devices; localhost refers to the phone itself. Local and production auth tokens/balances are separate. Do not overwrite production secret values with development credentials.

### Duration model input collection

The quotation form displays service details from the request without a task picker. New provider-ad requests preserve verified ad category, serviceLabel, and specificLabel in serviceContext. The backend derives all task inputs from that request, maps explicit category aliases (for example plumbing to Repairing / Plumbing Repair), and uses an exact catalogue task match when available. Unfamiliar task names remain source values and are flagged by model evidence; they are never presented as verified catalogue matches. Legacy requests use their existing detected category and object. Relevant experience is read from the authenticated Provider's saved task profile. The current registration/service/portfolio schemas contain no other reliable structured experience field; missing experience remains null and the evidence explicitly identifies model imputation. Providers do not have to type model measurements to send a quotation. Team size starts at one and is adjusted with minus/plus controls.

`GET /duration/provider-task-history` requires a provider JWT and counts that account's COMPLETED bookings in the trailing 30 days using completedAt (actualEndTime for legacy records). It groups by captured model task, counts each booking once, and reports unmapped older completions separately. The backend resolves this count at quotation submission, ignoring client frequency overrides. Unavailable history remains null rather than a fabricated zero.

The model receives platform completion frequency as an explicitly labelled proxy for total monthly task frequency. Outside work is not recorded, and the survey-trained feature may have a different distribution; field accuracy needs evaluation on this deployment data. Saved provider frequency declarations are no longer reused in this automatic flow. Quotations and coordination evidence retain the six exact inputs, input sources, and the observed history window/count. Rechecks use their saved measurements rather than rewriting history.

Restart auth, provider, and coordination services after deploying these changes. Auth service must reach `COORDINATION_SERVICE_URL` (local default http://localhost:5010) to validate legacy task-profile updates. Test first and repeat quotation flows on a device before presenting.
