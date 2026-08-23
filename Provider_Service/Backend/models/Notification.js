import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    type: {
      type: String,
      required: true,
      enum: [
        "NEW_REQUEST",
        "NEW_QUOTATION",
        "QUOTE_ACCEPTED",
        "NEW_MESSAGE",
        "BOOKING_CANCELLED",
      ],
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    metadata: {
      providerRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "ProviderRequest" },
      quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "Quotation" },
      bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);