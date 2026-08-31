import mongoose from "mongoose";

const quotationSchema = new mongoose.Schema(
  {
    providerRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    }, // Chaw: external RequestQuotation ID from Seeker Service; do not populate inside Provider Service

    externalSessionId: { // Chaw: links quotation to Member 2 ServiceSession, e.g. REPAIR-476B
      type: String,
      required: true,
      index: true,
    },

    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
      index: true,
    },

    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    }, // Chaw: removed User ref because user data belongs to Auth/User Service

    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    }, // Chaw: removed User ref because user data belongs to Auth/User Service

    providerSnapshot: {
      providerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceProvider",
      },
      name: {
        type: String,
        default: "",
      },
      businessName: {
        type: String,
        default: "",
      },
      phone: {
        type: String,
        default: "",
      },
      district: {
        type: String,
        default: "",
      },
      profileImage: {
        type: String,
        default: "",
      },
    },

    price: {
      type: Number,
      required: true,
      min: 0, // Chaw: prevents negative quotation amounts
    },

    proposedStartTime: { // Chaw: provider's proposed job start time for coordination validation
      type: Date,
      required: true,
    },

    coordinatedStartTime: {
      type: Date,
      default: null,
    }, // Chaw: final selected start time after bid coordination/reschedule
    
    coordinatedEndTime: {
      type: Date,
      default: null,
    }, // Chaw: final selected end time after bid coordination/reschedule

    estimatedDurationHours: { // Chaw: numeric duration used for scheduling/conflict calculation
      type: Number,
      required: true,
      min: 0.25,
    },

    durationText: {
      type: String,
      default: "",
    },

    notes: {
      type: String,
      default: "",
    },

    coordinationStatus: { // Chaw: updated later by Coordination Service
      type: String,
      enum: [
        "NOT_CHECKED",
        "CHECKING",
        "CAN_ACCEPT",
        "AVAILABLE_WITH_CAUTION",
        "RESCHEDULE_REQUIRED",
        "REJECTED_DUE_TO_CONFLICT",
      ],
      default: "NOT_CHECKED",
    },

    coordinationId: { // Chaw: stores BidCoordination ID after coordination check
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["SENT", "COUNTER_OFFERED", "ACCEPTED", "REJECTED", "EXPIRED"], // Chaw CHANGED: supports bidding/counter-offer flow
      default: "SENT",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Quotation", quotationSchema);
