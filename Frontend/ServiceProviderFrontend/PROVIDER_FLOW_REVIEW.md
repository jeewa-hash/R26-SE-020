# Provider flow review

The active My Jobs tab uses `screens/ProviderCalendarScreen.js` through `pages/BookingsScreen.js`. The separate `ProviderMyJobsScreen.js` is not registered as the main tab; its quotation-detail link is kept consistent.

## Changes

- Applied Jobs links to the original post and quotation requests. Search tolerates missing customer/location data. Removed local-only cancellation and inactive buttons: they did not cancel a server application.
- Already-applied post details provide View Application.
- Request details reload on focus, format dates, link to messages/post/quotations, and disable new quotation submission when awaiting a new time or no longer pending.
- Quotation submission leads to a registered Quotation Details screen. It reloads status, retries validation, requests a new time for conflicts, and links to the request, availability settings and matching booking.
- Booking details expose Confirm Ready, On My Way, Start, Report Delay and Complete. Delay minutes are validated. Closed bookings link to history; completed bookings link to earnings. Activity and refresh controls show changes.
- Web/native confirmation dialogs work. My Jobs prevents repeated mutations while updating and selects History after completion. Partial errors retain successful data with retry.
- Nested messages/My Jobs links target registered routes. Backend routes and seeker-owned acceptance/booking confirmation are unchanged.

## Automated checks

```bash
cd Frontend/ServiceProviderFrontend
node --test tests/providerFlow.test.cjs
```

State/confirmation tests use mocks. Expo web export checks bundling, not authenticated behavior.

## Manual end-to-end test: web and Expo Go

Use provider and seeker accounts connected to the same services/database.

1. Provider Home: apply to a seeker post. Open View Application and the original post. Reopen and confirm duplicate application is not offered.
2. Seeker: request a quote for a future time inside provider availability.
3. Provider Applied Jobs → View Quotation Requests: review the request, post/messages and availability. Submit a price.
4. Quotation Details shows validation and seeker decision. Retry pending validation. For conflicts ask the seeker to reschedule, then have the seeker choose a new time. Reopen the request and verify refreshed status.
5. Seeker accepts the quotation and confirms the coordinated booking. Acceptance alone is not a confirmed booking.
6. Provider Quotation Details → Refresh Status → Open Booking, or My Jobs → Scheduled → View Job. Verify it matches the quotation.
7. Confirm Ready. During backend-permitted time windows select On My Way, then Start. Check the seeker sees updates.
8. Report a delay with a reason and positive whole minutes. Invalid input must not submit. Complete after confirmation.
9. My Jobs → History: open the completed job. No lifecycle actions should remain. Review activity and open earnings; the earnings page remains authoritative for accounting.
10. Cancel a web confirmation: no mutation. Disconnect a service and refresh: show retry while retaining successful sections.

These live steps require running backends, matching JWT configuration and two accounts; they have not been executed automatically. Backend permissions, time windows, expiry and availability remain authoritative.

## Session overview

My Jobs now defaults to Sessions: requests, quotations and bookings are joined by explicit request/quotation/session identifiers into one service card. Stages show Requested → Quoted → Booked → Completed. Every card explains its current state, next actor (provider/seeker/review/no action), and primary destination. Filters show Needs you, Waiting for seeker, Booked, In progress and Closed. Action-needed sessions are listed first; accepted quotations remain waiting until a booking exists. Original detail tabs remain available with the same guidance. A last-checked timestamp and refresh explain freshness; status is refreshed on screen focus, not streamed live. Partial failures retain previously loaded data with an error banner.

Review these transitions with provider and seeker accounts: new request → saved quotation awaiting validation → validated offer waiting for seeker → accepted offer awaiting booking → confirmed booking → on the way → in progress → completed. Also check reschedule waits, conflicts and cancelled/expired sessions. Each session should appear once, while unrelated requests sharing a post remain separate. A new request should disappear from New Requests once its quotation is loaded. Switching detail tabs must not alter backend status.
