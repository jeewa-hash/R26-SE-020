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

    return next();
  } catch (error) {
    console.error("PAYMENT SUSPENSION MIDDLEWARE ERROR:", error.message);
    // On unexpected error, do not completely block server, continue
    return next();
  }
};
