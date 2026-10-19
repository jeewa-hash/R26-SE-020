# Seeker experience review

## Navigation and layout

The five main destinations are now **Home · My Services · Post Job · Bookings · Account**. The existing Bookings screen and route remain intact. My Services replaces the Feed tab; Community remains accessible from My Services. Account replaces the vague More label.

| Area | Finding | Implemented behavior |
| --- | --- | --- |
| Frequent work | Posts, sessions and calendar were under More | My Services opens session tracking, with shortcuts to posts, calendar, finding a service and community |
| Home | Live work appeared below promotional content | Active/upcoming bookings appear near the top; empty live-booking sections do not displace discovery |
| Discovery | Opening provider results directly showed an empty state; category taps showed “available soon” | Find a Service collects a description and starts the existing text-assessment → follow-up → provider-matching flow |
| Search | No pending state; filter chips had no behavior | Search has a busy state and bounded request time; the trailing action submits the search or opens the guided service form |
| Sent requests | Success messages sent users to look for My Jobs themselves | Request confirmations offer Track Request and Keep Browsing |
| Accepted quotation | General-list navigation after confirmation | Booking confirmation opens the resulting session/booking directly |
| Closed offers | Historical quotations could still offer confirmation | Session-linked booking and closed-offer states disable the quotation confirmation action |
| Provider contact | One provider-results action only displayed a fake chat-started alert | Provider results and booked sessions open a real chat thread; failures remain visible |
| Reschedule | One screen displayed success without sending a request | Suggestions use the coordination API; success appears only after saving, and the copy explains that the time is pending review |
| Completion | Review navigation passed an incompatible payload; cancelled jobs offered reviews | Completed-job review links carry the real booking and provider IDs; closed jobs without completion do not offer reviews |
| History | Rewards link used an unregistered route | Rewards opens the registered StarPointsScreen |
| Account | Core service work mixed with account controls | Account groups profile, appearance, language, history, rewards and support; one shortcut returns to My Services |
| Support | Sample contact details and a 24/7 support-chat claim | Provider messages are labelled accurately; support email/phone appear only when configured |
| Mobile navigation | No bottom-inset spacing; navigation competed with the keyboard and chat | Bottom safe area is respected; the bar hides for the keyboard and an open conversation; existing tab routes are reused |
| Connectivity | Session reads could wait indefinitely or disguise failures as empty lists | Session reads use bounded requests and distinguish empty data from unavailable data; cached sources remain visible on partial failure |

## Main journey to review

1. Open Home. Verify that active work is prominent and My Services is reachable without Account.
2. Use Find a Service or tap a category. Enter a description, submit, answer follow-up questions and review provider matches. A description is required; repeated submissions are blocked while waiting. Alternatively use Post Job → My Services → My Posts → provider responses.
3. Request a quotation. Keep browsing for another provider, then choose Track Request. Expect a session card with the right next actor.
4. Open the quotation. Pending availability and closed offers cannot be confirmed. Review an available quotation and confirm the booking. The resulting booking opens directly.
5. Track readiness, travelling, work started and delays through the session. Open Message Provider and verify the correct recipient.
6. Send a reschedule suggestion; verify a real request is recorded and the old booking time is not represented as already changed. Test a backend failure: success must not appear.
7. Complete the booking as provider. Open history and leave feedback for the actual booking/provider. Cancelled and expired jobs must not offer feedback.
8. From My Services, open posts, calendar, community, messages and notifications. Verify back navigation, count filters, dark mode and narrow screens. Open Bookings and verify its original layout and behavior.
9. Disconnect a backend and refresh. Expect an honest partial-load message, retained prior data and disabled confirmation in session details until refreshed successfully.

## Configuration and limits

- Service matching uses `TEXT_MODEL_URL` from config. It currently points to the configured LAN text service; that backend must be reachable. This change adds no new paid API.
- Optional contact settings: `EXPO_PUBLIC_SUPPORT_EMAIL` and `EXPO_PUBLIC_SUPPORT_PHONE`. Configure real support contacts before expecting these actions to appear.
- Existing remote-notification delivery still needs the backend configuration documented in the repository's notifications setup guide. This UI change does not add background push support.
- PaymentScreen remains a legacy local/demo card screen and is not promoted through the new navigation. A real payment-provider integration is separate work. Legacy Settings includes unfinished controls; Account exposes the working appearance/language controls directly rather than promoting those placeholders.
- English and Sinhala labels are included for the new main navigation and discovery screen; several older session/detail strings remain English.
- No live customer bookings, messages or payments were created during validation. Device testing with signed-in seeker/provider accounts is still required.

## Validation

Run `node --test tests/*.test.cjs` from the seeker app directory. Tests cover the unchanged Bookings destination, tab ownership/reuse, real chat routing/failure handling, session grouping and lifecycle guidance, and session API failure/fallback behavior. Expo iOS and web exports check bundling; they do not substitute for the signed-in device walkthrough above.
