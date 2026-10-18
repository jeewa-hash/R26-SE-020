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
