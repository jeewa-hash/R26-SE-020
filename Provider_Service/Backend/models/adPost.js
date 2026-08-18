/**
 * models/AdPost.js
 * Mongoose schema for AI-generated provider ad posts (FR-03, FR-16).
 * Each document stores the provider/service input used, which flow produced it
 * (manual input vs. ML portfolio classification output), and the generated
 * per-platform posts so providers can view, edit, and manage their post history.
 */

import mongoose from "mongoose";

const platformPostSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ["facebook", "instagram", "whatsapp", "sms"],
      required: true,
    },
    title: { type: String, default: "" },
    caption: { type: String, required: true },
    hashtags: { type: [String], default: [] },
  },
  { _id: false }
);

const adPostSchema = new mongoose.Schema(
  {
    providerId: { type: String, required: true, index: true },
    providerName: { type: String, required: true },
    location: { type: String, required: true },
    contact: { type: String, required: true },

    serviceLabel: { type: String, required: true },
    specificLabel: { type: String, default: null },
    category: { type: String, default: "home service" },
    tags: { type: [String], default: [] },

    tone: { type: String, default: "professional" },
    language: { type: String, enum: ["en", "si", "ta"], default: "en" },
    extraInfo: { type: String, default: "" },

    // Where the input for this post came from:
    // "manual" = provider typed details in directly
    // "ml"     = built from the Portfolio Classification model output (FR-12/FR-13)
    source: { type: String, enum: ["manual", "ml"], default: "manual" },
    mlResult: { type: mongoose.Schema.Types.Mixed, default: null },

    posts: { type: [platformPostSchema], default: [] },

    image: {
      requested: { type: Boolean, default: false },
      url: { type: String, default: null },
      note: { type: String, default: null },
    },

    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
  },
  { timestamps: true }
);

adPostSchema.index({ providerId: 1, createdAt: -1 });

export default mongoose.model("AdPost", adPostSchema);
