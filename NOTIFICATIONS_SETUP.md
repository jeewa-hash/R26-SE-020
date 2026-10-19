# Job lifecycle notifications

Both apps now use the auth service as the persistent lifecycle inbox and authenticated Socket.IO hub. Existing admin notifications remain in the same inbox. REST polling (15 seconds) retrieves missed socket events. Sockets deliver while the app is running; this change does not add remote background push delivery.

## Configuration

Set `NOTIFICATION_SERVICE_SECRET` to the same random server-only value in **authService, Seeker_Service, Provider_Service/Backend and ServiceCoordinationService**. Generate a value locally with `openssl rand -hex 32`. Never put this secret in an Expo public environment variable or commit it.

Set `AUTH_SERVICE_URL` in the three sending backends to the reachable auth origin, for example `http://localhost:4003` when all servers run on the same machine. Containers must use a reachable service hostname. Both mobile app configs must point to this same auth deployment; a phone must use the machine's LAN IP for a local server.

For local web or simulator testing, both mobile apps now default to `http://localhost:4003`. Set `EXPO_PUBLIC_AUTH_SERVICE_URL` to `http://<your-mac-lan-ip>:4003` when testing on a physical phone, or to the deployed auth origin for a deployment build. Lifecycle delivery remains disabled until the shared backend secret is configured and all four backend processes are restarted.

Restart all four backends and reload both apps. The auth service must be able to create the sparse unique `eventId` indexes on ProviderNotification and SeekerNotification. If automatic index creation is disabled, create these indexes through your deployment's MongoDB migration procedure before enabling event delivery.

Missing sender configuration disables lifecycle publishing. Delivery failures log a status/code without credentials and do not undo a successful booking or quotation. A failed server-to-server request currently needs operational recovery; this is not a durable outbox/retry queue.

## Events and review

- New quotation request → provider; quotation sent → seeker; quotation accepted → provider.
- Quotation time-change request → seeker; updated requested time → provider.
- Booking confirmed, provider ready, travelling, started, delay, reschedule requested/confirmed, completed, cancelled and expired → both participants.
- Notifications open the relevant provider detail page or seeker bookings/request page. Read state persists through the auth REST API. Legacy seeker quotation entries remain as fallback, deduplicated when a persisted quotation alert exists.

Sign in on two devices as the matching provider and seeker. Walk through a request, quotation and booking, then ready, travel, start and complete. Review each recipient's inbox, unread badge and detail link. Separately exercise delay, reschedule and cancellation on fresh bookings. Disconnect a phone, perform an action, reconnect and verify history is fetched. Another account must not receive these alerts. Test concurrent devices for the same account as well.

Run automated checks with `node --test authService/test/lifecycleNotifications.test.cjs Frontend/ServiceProviderFrontend/tests/providerFlow.test.cjs`.

The auth socket now requires a login JWT and only joins its verified user's room (or the admin room for an admin). Deploy updated clients with the server. Existing chat sockets in other services are unchanged.

## Seeker navigation cross-check

The seeker inbox, Home badge and My Services badge now share one notification store. The inbox no longer sends its own duplicate read mutations. Inbox rows and toast banners use the same destinations: booking alerts open the exact session by booking ID; quotation/time-change alerts open the session linked to their provider request. Tapping a toast also marks it read. A new alert refreshes an already open detail screen.

Quote fallback notifications share a popup identity with their persisted quotation alert, so polling and sockets do not announce the same offer twice. Read/clear state is account-scoped, repeated read actions cannot decrement unread counts twice, and clearing the inbox suppresses old synthetic quotation entries. Partial fetch failures retain previously loaded sources and show an inline retry message. Background push and durable backend delivery retries remain outside this implementation.

Local setup (19 October 2026): all four ignored backend `.env` files now share a generated notification secret. The three senders use `AUTH_SERVICE_URL=http://127.0.0.1:4003`; coordination uses the local provider and seeker APIs. Both mobile configs default to the laptop LAN host for auth (4003), seeker (6000), provider (3002), and coordination (5010). Override `EXPO_PUBLIC_API_HOST` for a different LAN IP. A physical phone must never use `localhost` for the laptop API. Hosted deployment configuration has not been changed.

Restart Expo with `npx expo start --clear` in each app after changing these URLs. Both devices must be on the laptop's network. The four backend processes were restarted for local notification testing. Re-login if the app holds a token from a different auth environment.

Local transport regression: `node --test authService/test/lifecycleTransport.test.cjs` runs an ephemeral HTTP/Socket.IO hub with in-memory storage, verifies 14 event types for both roles, and checks duplicate suppression. It does not create production records or replace phone testing.

After configuring and restarting, test with a provider and seeker account: send a quotation, receive it with the inbox closed, tap the banner, confirm the exact session opens and both badges decrement once. Repeat with delay, reschedule and completion. Disconnect/reconnect the seeker and confirm history recovers without repeated popups. Mark all read, refresh, clear, refresh, then sign out and sign in as another seeker to verify isolation. No live account notifications were sent by the automated checks.

Checks: `node --test Frontend/Seeker_Mobile_App/tests/*.test.cjs authService/test/lifecycleNotifications.test.cjs`.

## Scheduled start reminders and expired-service recovery

The coordination server starts a Mongo-backed reminder worker after its database connects. It scans every 30 seconds: 30 minutes before start (when travel is not confirmed), at scheduled start, and 15 minutes after start. It expires unstarted services after 45 minutes; travelling alone or an unapproved reschedule does not prevent expiry. A started service receives no further start reminders.

Each participant gets a stable event identity per appointment time and stage. Delivery records in `bookingreminderdeliveries` use leases and retry failed deliveries after one minute. The auth inbox deduplicates retries. Stale queued reminders are suppressed when work starts, the service closes, or its appointment changes. On restart, the worker recovers expiry notices for bookings expired within the last 24 hours. The coordination process must remain running; this is in-app/socket plus persisted inbox delivery, not remote background push.

Providers may start from 30 minutes before the appointment through 45 minutes after it. The backend enforces that interval and records actual start time.

Seeker My Services → History → expired service offers **Request a New Time**. A future customer proposal stays pending while the booking remains EXPIRED. Only the assigned provider can approve after schedule and travel validation. Approval clears expiry/readiness for the new appointment, preserves the old timeline, and returns the service to RESCHEDULED. Rejection leaves it expired and allows another proposal. Admin penalty logic and the separate seeker Bookings screens are unchanged.

Regression checks: `node --test ServiceCoordinationService/tests/*.test.js`. The tests use fixed clocks and test records rather than waiting for real appointment deadlines.

### Duration model input collection

The quotation form displays service details from the request without a task picker. New provider-ad requests preserve verified ad category, serviceLabel, and specificLabel in serviceContext. The backend derives all task inputs from that request, maps explicit category aliases (for example plumbing to Repairing / Plumbing Repair), and uses an exact catalogue task match when available. Unfamiliar task names remain source values and are flagged by model evidence; they are never presented as verified catalogue matches. Legacy requests use their existing detected category and object. Relevant experience is read from the authenticated Provider's saved task profile. The current registration/service/portfolio schemas contain no other reliable structured experience field; missing experience remains null and the evidence explicitly identifies model imputation. Providers do not have to type model measurements to send a quotation. Team size starts at one and is adjusted with minus/plus controls.

`GET /duration/provider-task-history` requires a provider JWT and counts that account's COMPLETED bookings in the trailing 30 days using completedAt (actualEndTime for legacy records). It groups by captured model task, counts each booking once, and reports unmapped older completions separately. The backend resolves this count at quotation submission, ignoring client frequency overrides. Unavailable history remains null rather than a fabricated zero.

The model receives platform completion frequency as an explicitly labelled proxy for total monthly task frequency. Outside work is not recorded, and the survey-trained feature may have a different distribution; field accuracy needs evaluation on this deployment data. Saved provider frequency declarations are no longer reused in this automatic flow. Quotations and coordination evidence retain the six exact inputs, input sources, and the observed history window/count. Rechecks use their saved measurements rather than rewriting history.

Restart auth, provider, and coordination services after deploying these changes. Auth service must reach `COORDINATION_SERVICE_URL` (local default http://localhost:5010) to validate legacy task-profile updates. Test first and repeat quotation flows on a device before presenting.
