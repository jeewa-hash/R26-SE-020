import Stripe from "stripe";
import CommissionBilling from "../models/CommissionBilling.js";
import {
  getProviderBillingOverview,
  syncProviderMonthlyBill,
  checkProviderSuspension,
  processBillPaymentSuccess,
  getMonthDateBounds,
} from "../services/commissionBillingService.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * GET /api/provider/billing/overview
 * Get provider's comprehensive billing overview, monthly bills, and suspension status
 */
export const getBillingOverview = async (req, res) => {
  try {
    const providerId = req.user?.id;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: "Provider authentication required",
      });
    }

    const overview = await getProviderBillingOverview(providerId);

    return res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (error) {
    console.error("GET BILLING OVERVIEW ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get billing overview",
      error: error.message,
    });
  }
};

/**
 * GET /api/provider/billing/month/:month
 * Get specific month's bill details
 */
export const getBillingByMonth = async (req, res) => {
  try {
    const providerId = req.user?.id;
    const { month } = req.params; // format "YYYY-MM"

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: "Provider authentication required",
      });
    }

    const bill = await syncProviderMonthlyBill(providerId, month);

    return res.status(200).json({
      success: true,
      data: bill,
    });
  } catch (error) {
    console.error("GET BILLING BY MONTH ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get monthly bill details",
      error: error.message,
    });
  }
};

/**
 * POST /api/provider/billing/refresh
 * Recalculate/refresh monthly earnings and 5% service charge
 */
export const refreshMonthlyBill = async (req, res) => {
  try {
    const providerId = req.user?.id;
    const { month } = req.body;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: "Provider authentication required",
      });
    }

    const bill = await syncProviderMonthlyBill(providerId, month || null);

    return res.status(200).json({
      success: true,
      message: "Billing statement refreshed successfully",
      data: bill,
    });
  } catch (error) {
    console.error("REFRESH BILL ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to refresh billing statement",
      error: error.message,
    });
  }
};

/**
 * GET /api/provider/billing/suspension-status
 * Check if the provider is currently suspended due to unpaid service charges
 */
export const getSuspensionStatus = async (req, res) => {
  try {
    const providerId = req.user?.id;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: "Provider authentication required",
      });
    }

    const suspensionInfo = await checkProviderSuspension(providerId);

    return res.status(200).json({
      success: true,
      data: suspensionInfo,
    });
  } catch (error) {
    console.error("GET SUSPENSION STATUS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get suspension status",
      error: error.message,
    });
  }
};

/**
 * POST /api/provider/billing/create-checkout-session
 * Create Stripe Checkout Session for 5% Service Charge Commission
 */
export const createCommissionCheckoutSession = async (req, res) => {
  try {
    const providerId = req.user?.id;
    const { billingId, month } = req.body;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: "Provider authentication required",
      });
    }

    let bill;
    if (billingId) {
      bill = await CommissionBilling.findById(billingId);
    } else if (month) {
      bill = await syncProviderMonthlyBill(providerId, month);
    } else {
      // Default to the most urgent unpaid overdue bill or previous month bill
      const overdueBill = await CommissionBilling.findOne({
        providerId,
        status: { $in: ["OVERDUE", "SUSPENDED", "PENDING"] },
        serviceChargeAmount: { $gt: 0 },
      }).sort({ dueDate: 1 });

      bill = overdueBill || (await syncProviderMonthlyBill(providerId));
    }

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Billing statement not found",
      });
    }

    if (bill.providerId.toString() !== providerId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only pay your own billing statement",
      });
    }

    if (bill.status === "PAID") {
      return res.status(400).json({
        success: false,
        message: "This monthly service charge has already been paid in full.",
        data: bill,
      });
    }

    if (bill.serviceChargeAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "No platform service charges are due for this month (amount is LKR 0).",
        data: bill,
      });
    }

    const checkoutBaseUrl = (process.env.CLIENT_URL || "http://localhost:3002").replace(/\/$/, "");

    // In Stripe, unit_amount for LKR is in cents (smallest currency unit, * 100)
    const amountInCents = Math.round(bill.serviceChargeAmount * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "lkr",
            product_data: {
              name: `Platform Service Charge (5%) - ${bill.billingMonth}`,
              description: `Monthly platform fee (5% of LKR ${bill.totalIncome} earnings) for ${bill.billingMonth}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "COMMISSION_SERVICE_CHARGE",
        billingId: bill._id.toString(),
        providerId: bill.providerId.toString(),
        billingMonth: bill.billingMonth,
        totalCharged: bill.serviceChargeAmount.toString(),
      },
      success_url: `${checkoutBaseUrl}/billing-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${checkoutBaseUrl}/billing-cancelled`,
    });

    bill.paymentDetails.stripeSessionId = session.id;
    bill.paymentDetails.paymentStatus = "pending";
    await bill.save();

    return res.status(200).json({
      success: true,
      url: session.url,
      sessionId: session.id,
      bill,
    });
  } catch (error) {
    console.error("CREATE COMMISSION CHECKOUT SESSION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create checkout session for service charge",
      error: error.message,
    });
  }
};

/**
 * POST /api/provider/billing/confirm-payment/:sessionId
 * Confirm completed Stripe payment and un-suspend provider account
 */
export const confirmCommissionPayment = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const providerId = req.user?.id;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Stripe sessionId is required",
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({
        success: false,
        message: "Payment has not been completed on Stripe.",
      });
    }

    const sessionProviderId = session.metadata?.providerId;
    if (providerId && sessionProviderId && sessionProviderId !== providerId.toString()) {
      return res.status(403).json({
        success: false,
        message: "This payment session does not belong to your provider account",
      });
    }

    const result = await processBillPaymentSuccess(sessionId, session);

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.bill,
      isSuspended: result.isSuspended,
    });
  } catch (error) {
    console.error("CONFIRM COMMISSION PAYMENT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to confirm commission payment",
      error: error.message,
    });
  }
};
