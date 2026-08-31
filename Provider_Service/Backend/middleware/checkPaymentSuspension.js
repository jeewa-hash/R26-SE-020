import { checkProviderSuspension } from "../services/commissionBillingService.js";

/**
 * Middleware to enforce payment suspension on provider feature actions.
 * If a provider has overdue unpaid 5% service charge bills past the 3-day grace period,
 * this middleware blocks all regular feature requests and only allows billing / payment actions.
 */
export const checkPaymentSuspension = async (req, res, next) => {
  try {
    // If not a provider (e.g., Admin or Seeker accessing public/other routes), allow
    if (req.user && req.user.role && req.user.role !== "ServiceProvider") {
      return next();
    }

    const providerId =
      req.user?.id ||
      req.user?._id ||
      req.params?.providerId ||
      req.body?.providerId;

    if (!providerId) {
      return next();
    }

    const suspensionInfo = await checkProviderSuspension(providerId.toString());

    if (suspensionInfo.isSuspended) {
      return res.status(403).json({
        success: false,
        error: "PAYMENT_SUSPENDED",
        isSuspended: true,
        message:
          "Your account is suspended due to unpaid monthly platform service charges (5% commission) past the 3-day grace period. All other features are blocked. Please settle your outstanding balance via the Payment Portal to restore full access.",
        overdueBills: suspensionInfo.overdueBills.map((b) => ({
          _id: b._id,
          billingMonth: b.billingMonth,
          totalIncome: b.totalIncome,
          serviceChargeAmount: b.serviceChargeAmount,
          dueDate: b.dueDate,
          status: b.status,
        })),
      });
    }

    // 2. Check Penalty Score & Account Lock restrictions from Admin Service
    try {
      const adminUrl = process.env.ADMIN_SERVICE_URL || "http://localhost:5001";
      const statusRes = await fetch(`${adminUrl}/api/inquiries/check-bookable/${providerId}`, {
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(2500),
      });
      if (statusRes.ok) {
        const pStatus = await statusRes.json();
        if (pStatus.isRestricted || pStatus.isBlocked || (typeof pStatus.penaltyScore === 'number' && pStatus.penaltyScore >= 3)) {
          return res.status(403).json({
            success: false,
            error: "PENALTY_RESTRICTED",
            isRestricted: true,
            penaltyScore: pStatus.penaltyScore,
            penaltyRatio: pStatus.penaltyRatio,
            message:
              `Posting and service actions are restricted. Your penalty score has reached ${pStatus.penaltyRatio || '3/3'} due to missed or cancelled bookings. Please submit an inquiry for your missed bookings to clear your penalty points.`,
          });
        }
      }
    } catch (penaltyErr) {
      // Non-blocking fallback
    }

    return next();
  } catch (error) {
    console.error("PAYMENT SUSPENSION MIDDLEWARE ERROR:", error.message);
    // On unexpected error, do not completely block server, continue
    return next();
  }
};
