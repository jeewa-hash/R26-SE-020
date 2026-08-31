import CommissionBilling from "../models/CommissionBilling.js";
import Transaction from "../models/Transaction.js";
import Notification from "../models/Notification.js";
import { getProviderCompletedEarnings } from "../clients/coordinationServiceClient.js";

/**
 * Helper to compute month boundaries and 3-day payment grace period due date
 * @param {string} [monthStr] - "YYYY-MM" (e.g. "2026-08")
 */
export const getMonthDateBounds = (monthStr = null) => {
  let year, month; // month is 1-indexed (1-12)

  if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
    const [y, m] = monthStr.split("-").map(Number);
    year = y;
    month = m;
  } else {
    const now = new Date();
    year = now.getUTCFullYear();
    month = now.getUTCMonth() + 1;
  }

  const pad = (n) => String(n).padStart(2, "0");
  const billingMonth = `${year}-${pad(month)}`;

  // Period Start: 1st day of month 00:00:00.000 UTC
  const periodStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));

  // Period End: Last day of month 23:59:59.999 UTC (Day 0 of next month is last day of current)
  const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  // Due Date: Exactly 3 days after month end (3rd day of following month at 23:59:59.999 UTC)
  // For month 12 (Dec), month is 12, so Date.UTC(year, 12, 3) rolls over to Jan 3 of next year automatically
  const dueDate = new Date(Date.UTC(year, month, 3, 23, 59, 59, 999));

  return {
    billingMonth,
    periodStart,
    periodEnd,
    dueDate,
  };
};

/**
 * Get the previous month string in "YYYY-MM" format
 */
export const getPreviousMonthStr = (monthStr = null) => {
  const { periodStart } = getMonthDateBounds(monthStr);
  const prevDate = new Date(periodStart.getTime() - 24 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${prevDate.getUTCFullYear()}-${pad(prevDate.getUTCMonth() + 1)}`;
};

/**
 * Calculate and sync a provider's monthly billing record from completed bookings
 * @param {string} providerId
 * @param {string} [monthStr] - "YYYY-MM"
 */
export const syncProviderMonthlyBill = async (providerId, monthStr = null) => {
  const { billingMonth, periodStart, periodEnd, dueDate } = getMonthDateBounds(monthStr);

  // Fetch earnings from Coordination Service
  const earningsData = await getProviderCompletedEarnings(providerId, billingMonth);
  const totalIncome = Number(earningsData.totalIncome) || 0;
  const completedBookingsCount = Number(earningsData.completedBookingsCount) || (earningsData.bookings?.length || 0);
  const completedBookingIds = (earningsData.bookings || []).map((b) => String(b._id || b.id));

  // Calculate 5% service charges (rounded to nearest 2 decimals)
  const COMMISSION_RATE = 0.05; // 5%
  const serviceChargeAmount = Math.round(totalIncome * COMMISSION_RATE * 100) / 100;

  let bill = await CommissionBilling.findOne({ providerId, billingMonth });

  const now = new Date();
  const isPastDueDate = now > dueDate;

  if (!bill) {
    let initialStatus = "PENDING";
    let isSuspended = false;
    let suspendedAt = null;
    let suspensionReason = "";

    if (totalIncome === 0) {
      initialStatus = "WAIVED";
    } else if (isPastDueDate) {
      initialStatus = "SUSPENDED";
      isSuspended = true;
      suspendedAt = now;
      suspensionReason = `Unpaid 5% platform service charges (LKR ${serviceChargeAmount}) for ${billingMonth} past 3-day grace period.`;
    }

    bill = await CommissionBilling.create({
      providerId,
      billingMonth,
      billingPeriodStart: periodStart,
      billingPeriodEnd: periodEnd,
      totalIncome,
      commissionRate: COMMISSION_RATE,
      serviceChargeAmount,
      dueDate,
      status: initialStatus,
      isSuspended,
      suspendedAt,
      suspensionReason,
      completedBookingsCount,
      completedBookingIds,
      lastCalculatedAt: now,
    });
  } else {
    // If not already paid, update totalIncome and serviceChargeAmount
    if (bill.status !== "PAID") {
      bill.totalIncome = totalIncome;
      bill.serviceChargeAmount = serviceChargeAmount;
      bill.completedBookingsCount = completedBookingsCount;
      bill.completedBookingIds = completedBookingIds;
      bill.lastCalculatedAt = now;

      if (totalIncome === 0) {
        bill.status = "WAIVED";
        bill.isSuspended = false;
        bill.suspendedAt = null;
        bill.suspensionReason = "";
      } else if (isPastDueDate && serviceChargeAmount > 0) {
        bill.status = "SUSPENDED";
        bill.isSuspended = true;
        bill.suspendedAt = bill.suspendedAt || now;
        bill.suspensionReason = `Unpaid 5% platform service charges (LKR ${serviceChargeAmount}) for ${billingMonth} past 3-day grace period.`;
      } else if (!isPastDueDate) {
        bill.status = "PENDING";
        bill.isSuspended = false;
        bill.suspendedAt = null;
        bill.suspensionReason = "";
      }

      await bill.save();
    }
  }

  return bill;
};

/**
 * Check if a provider has active payment suspensions due to unpaid service charge bills
 * @param {string} providerId
 */
export const checkProviderSuspension = async (providerId) => {
  const now = new Date();

  // Find all unpaid bills with service charge > 0
  const unpaidBills = await CommissionBilling.find({
    providerId,
    status: { $in: ["PENDING", "OVERDUE", "SUSPENDED"] },
    serviceChargeAmount: { $gt: 0 },
  });

  const overdueBills = [];

  for (const bill of unpaidBills) {
    if (now > bill.dueDate) {
      if (!bill.isSuspended || bill.status !== "SUSPENDED") {
        bill.status = "SUSPENDED";
        bill.isSuspended = true;
        bill.suspendedAt = bill.suspendedAt || now;
        bill.suspensionReason = `Unpaid 5% platform service charges (LKR ${bill.serviceChargeAmount}) for ${bill.billingMonth} past 3-day grace period.`;
        await bill.save();
      }
      overdueBills.push(bill);
    }
  }

  const isSuspended = overdueBills.length > 0;

  return {
    isSuspended,
    overdueBills,
    reason: isSuspended
      ? `Your account is suspended due to unpaid monthly platform service charges (5% commission). All regular features are blocked until payment is settled via the Payment Portal.`
      : null,
  };
};

/**
 * Get comprehensive billing overview for provider
 * @param {string} providerId
 */
export const getProviderBillingOverview = async (providerId) => {
  const currentMonthStr = getMonthDateBounds().billingMonth;
  const previousMonthStr = getPreviousMonthStr(currentMonthStr);

  // Sync current month and previous month bills
  await syncProviderMonthlyBill(providerId, currentMonthStr);
  await syncProviderMonthlyBill(providerId, previousMonthStr);

  // Evaluate suspension
  const suspensionInfo = await checkProviderSuspension(providerId);

  // Retrieve all monthly billing statements
  const allBills = await CommissionBilling.find({ providerId }).sort({ billingMonth: -1 });

  // Retrieve all Ad Boost payment transactions for provider
  const boostTransactions = await Transaction.find({
    providerId: providerId.toString(),
    type: { $in: ["boost", undefined] },
    status: "completed",
  }).sort({ createdAt: -1 });

  const totalSpentOnBoosts = boostTransactions.reduce((sum, tx) => sum + (Number(tx.amountPaid) || 0), 0);
  const totalBoostSteps = boostTransactions.reduce((sum, tx) => sum + (Number(tx.boostAmount) || 0), 0);

  // Calculate lifetime totals
  const lifetimeStats = allBills.reduce(
    (acc, b) => {
      acc.totalEarned += Number(b.totalIncome) || 0;
      if (b.status === "PAID") {
        acc.totalCommissionPaid += Number(b.serviceChargeAmount) || 0;
      } else if (["PENDING", "OVERDUE", "SUSPENDED"].includes(b.status)) {
        acc.totalCommissionPending += Number(b.serviceChargeAmount) || 0;
      }
      acc.completedBookingsTotal += Number(b.completedBookingsCount) || 0;
      return acc;
    },
    {
      totalEarned: 0,
      totalCommissionPaid: 0,
      totalCommissionPending: 0,
      completedBookingsTotal: 0,
    }
  );

  const netEarnings = Math.max(0, lifetimeStats.totalEarned - lifetimeStats.totalCommissionPaid - totalSpentOnBoosts);

  const currentBill = allBills.find((b) => b.billingMonth === currentMonthStr) || null;

  return {
    isSuspended: suspensionInfo.isSuspended,
    suspensionReason: suspensionInfo.reason,
    overdueBillsCount: suspensionInfo.overdueBills.length,
    currentMonthBill: currentBill,
    bills: allBills,
    lifetimeStats: {
      ...lifetimeStats,
      netEarnings,
      totalSpentOnBoosts,
      totalBoostSteps,
      boostCount: boostTransactions.length,
    },
    adBoostStats: {
      totalSpentOnBoosts,
      totalBoostSteps,
      boostCount: boostTransactions.length,
      recentBoosts: boostTransactions.slice(0, 10).map((tx) => ({
        _id: tx._id,
        adPostId: tx.adPostId,
        amountPaid: tx.amountPaid,
        boostAmount: tx.boostAmount,
        currency: tx.currency,
        createdAt: tx.createdAt,
      })),
    },
  };
};

/**
 * Handle successful payment completion for a commission bill
 * @param {string} stripeSessionId
 * @param {object} [sessionDetails] - Optional Stripe session object
 */
export const processBillPaymentSuccess = async (stripeSessionId, sessionDetails = {}) => {
  let bill = await CommissionBilling.findOne({
    "paymentDetails.stripeSessionId": stripeSessionId,
  });

  if (!bill && sessionDetails?.metadata?.billingId) {
    bill = await CommissionBilling.findById(sessionDetails.metadata.billingId);
  }

  if (!bill) {
    throw new Error(`Billing record not found for Stripe session ${stripeSessionId}`);
  }

  if (bill.status === "PAID") {
    return { bill, alreadyPaid: true };
  }

  const amountPaid = Number(sessionDetails.amount_total ? sessionDetails.amount_total / 100 : bill.serviceChargeAmount);

  // Update bill to PAID and lift suspension on this bill
  bill.status = "PAID";
  bill.isSuspended = false;
  bill.suspendedAt = null;
  bill.suspensionReason = "";
  bill.paymentDetails = {
    stripeSessionId,
    amountPaid,
    paidAt: new Date(),
    currency: sessionDetails.currency || "lkr",
    paymentStatus: "completed",
    receiptUrl: sessionDetails.receipt_url || "",
  };

  await bill.save();

  // Save Transaction ledger record
  const existingTx = await Transaction.findOne({ stripeSessionId });
  if (!existingTx) {
    await Transaction.create({
      type: "commission_service_charge",
      billingId: bill._id,
      billingMonth: bill.billingMonth,
      providerId: bill.providerId.toString(),
      stripeSessionId,
      amountPaid,
      currency: sessionDetails.currency || "lkr",
      status: "completed",
    });
  }

  // Check if provider has any remaining overdue unpaid bills
  const remainingSuspensions = await checkProviderSuspension(bill.providerId.toString());

  // Create In-App Notification
  try {
    await Notification.create({
      recipientId: bill.providerId,
      senderId: bill.providerId,
      type: "COMMISSION_PAID",
      title: "Service Charge Payment Successful",
      message: `Your 5% platform service charge payment of LKR ${amountPaid} for ${bill.billingMonth} has been completed successfully.${
        !remainingSuspensions.isSuspended ? " Your account access is fully active." : ""
      }`,
      metadata: {
        billingId: bill._id,
        billingMonth: bill.billingMonth,
        amountPaid,
        isSuspended: remainingSuspensions.isSuspended,
      },
    });
  } catch (notifErr) {
    console.error("Failed to create notification for commission payment:", notifErr.message);
  }

  return {
    bill,
    isSuspended: remainingSuspensions.isSuspended,
    message: !remainingSuspensions.isSuspended
      ? "Payment received successfully. All features are now unlocked!"
      : "Payment received. Other overdue bills remain pending.",
  };
};
