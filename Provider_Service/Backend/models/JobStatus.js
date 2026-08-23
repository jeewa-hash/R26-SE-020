// models/JobStatus.js
import mongoose from "mongoose";

const jobStatusSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    jobTitle: { type: String, default: "" },
    jobCategory: { type: String, default: "" },
    jobLocation: { type: String, default: "" },
    status: {
      type: String,
      enum: ["applied", "accepted", "rejected", "cancelled", "completed"],
      default: "applied",
    },
    appliedAt: { type: Date, default: Date.now },
    statusUpdatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

jobStatusSchema.index(
  { postId: 1, providerId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "applied" } }
);

export default mongoose.model("JobStatus", jobStatusSchema);