import mongoose from "mongoose";

const commissionBillingSchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider",
      required: true,
      index: true,
    },

    // Format: "YYYY-MM" (e.g. "2026-08")
    billingMonth: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    // Period Start (1st day of month 00:00:00)
    billingPeriodStart: {
      type: Date,
      required: true,
    },

    // Period End (last day of month 23:59:59)
    billingPeriodEnd: {
      type: Date,
      required: true,
    },

    // Total income earned by provider from completed bookings in this month (LKR)
    totalIncome: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    // Platform commission rate (5% = 0.05)
    commissionRate: {
      type: Number,
      required: true,
      default: 0.05,
    },

    // Calculated platform service charge: totalIncome * commissionRate (LKR)
    serviceChargeAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    // Payment Due Date: 3 days after month end (e.g. 3rd day of following month at 23:59:59)
    dueDate: {
      type: Date,
      required: true,
      index: true,
    },

    // Status:
    // PENDING   - Bill generated, within 3-day grace period
    // PAID      - Service charges paid via Stripe / Payment Portal
    // OVERDUE   - Past 3-day grace period, awaiting suspension or payment
    // SUSPENDED - Account suspended due to non-payment; features blocked
    // WAIVED    - Total income was 0 LKR (no service charge required)
    status: {
      type: String,
      enum: ["PENDING", "PAID", "OVERDUE", "SUSPENDED", "WAIVED"],
      default: "PENDING",
      index: true,
    },

    // Whether this unpaid bill currently caused provider account suspension
    isSuspended: {
      type: Boolean,
      default: false,
      index: true,
    },

    suspendedAt: {
      type: Date,
      default: null,
    },

    suspensionReason: {
      type: String,
      default: "",
    },

    // Stripe / Payment Details
    paymentDetails: {
      stripeSessionId: {
        type: String,
        default: null,
      },
      amountPaid: {
        type: Number,
        default: 0,
      },
      paidAt: {
        type: Date,
        default: null,
      },
      currency: {
        type: String,
        default: "lkr",
      },
      paymentStatus: {
        type: String,
        enum: ["unpaid", "pending", "completed", "failed"],
        default: "unpaid",
      },
      receiptUrl: {
        type: String,
        default: "",
      },
    },

    completedBookingsCount: {
      type: Number,
      default: 0,
    },

    completedBookingIds: {
      type: [String],
      default: [],
    },

    lastCalculatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Ensure one billing record per provider per month
commissionBillingSchema.index({ providerId: 1, billingMonth: 1 }, { unique: true });

export default mongoose.model("CommissionBilling", commissionBillingSchema);
