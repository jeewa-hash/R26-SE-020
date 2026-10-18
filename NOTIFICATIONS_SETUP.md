# Job lifecycle notifications

Both apps now use the auth service as the persistent lifecycle inbox and authenticated Socket.IO hub. Existing admin notifications remain in the same inbox. REST polling (15 seconds) retrieves missed socket events. Sockets deliver while the app is running; this change does not add remote background push delivery.

## Configuration

Set `NOTIFICATION_SERVICE_SECRET` to the same random server-only value in **authService, Seeker_Service, Provider_Service/Backend and ServiceCoordinationService**. Generate a value locally with `openssl rand -hex 32`. Never put this secret in an Expo public environment variable or commit it.

Set `AUTH_SERVICE_URL` in the three sending backends to the reachable auth origin, for example `http://localhost:4003` when all servers run on the same machine. Containers must use a reachable service hostname. Both mobile app configs must point to this same auth deployment; a phone must use the machine's LAN IP for a local server.

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

Local configuration audit: the four backend `.env` files had no `NOTIFICATION_SERVICE_SECRET`; `Seeker_Service` also had no `AUTH_SERVICE_URL`. No secrets or deployment settings were changed. Hosted deployments must be checked independently; local files do not establish hosted configuration.

After configuring and restarting, test with a provider and seeker account: send a quotation, receive it with the inbox closed, tap the banner, confirm the exact session opens and both badges decrement once. Repeat with delay, reschedule and completion. Disconnect/reconnect the seeker and confirm history recovers without repeated popups. Mark all read, refresh, clear, refresh, then sign out and sign in as another seeker to verify isolation. No live account notifications were sent by the automated checks.

Checks: `node --test Frontend/Seeker_Mobile_App/tests/*.test.cjs authService/test/lifecycleNotifications.test.cjs`.
