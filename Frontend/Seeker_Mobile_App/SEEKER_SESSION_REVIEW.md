# Seeker session review

Open the **My Services** tab, or use **Account → My Services**. Bookings and My Jobs keep their existing screens and tabs. Each card joins explicit request, quotation and booking IDs, shows the four lifecycle stages, explains who acts next and opens the related session. Tap the visible **All, Active, Scheduled, Ongoing, History** labels to filter sessions; each label displays its count.

Review with a seeker and provider account:

1. Request prices from two providers in one session. Expect one card, two requests and “Waiting for provider quotations.” A different session with the same service title must stay separate.
2. Send a quotation with pending availability. Expect “Quotation availability pending”; confirmation stays disabled.
3. Complete availability validation. Expect “Quotations ready to review.” Compare prices and review an offer. An accepted price without a booking must still say booking confirmation is needed.
4. Confirm a booking. Expect the booked stage and “View Booking.” Quotation selection is disabled for that session.
5. Confirm provider readiness, travel and start work. Return to Sessions or pull down to refresh; expect the matching explanation and next actor. The overview refreshes every 30 seconds while focused.
6. Report a delay and request a schedule change. Expect an attention message. “Suggest a Different Time” opens the real suggestion API flow; it does not immediately change the booking time.
7. Complete the job. Expect History, “View Completed Job” and a review action linked to the actual booking/provider. Cancelled and expired jobs must not offer feedback or rescheduling.
8. Temporarily stop one backend and refresh. Previously loaded data stays visible with a partial-update warning. Confirmation is blocked in session details until a successful refresh.
9. Check dark mode and narrow screens; verify My Services remains highlighted on its session, posts and calendar screens while Bookings keeps its existing navigation.

Automated state/grouping checks: `node --test tests/seekerSessions.test.cjs` from this app directory. Native build check: `npx expo export --platform ios`.
