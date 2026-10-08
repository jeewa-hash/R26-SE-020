import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
  {
    providerId: {
      type: String,
      required: true,
      index: true,
    },
    providerName: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameLower: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "home service",
    },
    categoryGroup: {
      type: String,
      default: "other",
    },
    basePrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    priceUnit: {
      type: String,
      enum: ["hour", "day", "job", "sqft", "item"],
      default: "job",
    },
    tags: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    source: {
      type: String,
      enum: ["manual", "ml", "both"],
      default: "manual",
    },
    mlDetected: {
      type: Boolean,
      default: false,
    },
    mlResult: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

serviceSchema.index({ providerId: 1, nameLower: 1 }, { unique: true });

serviceSchema.index({ providerId: 1, createdAt: -1 });
serviceSchema.index({ category: 1, isActive: 1 });

serviceSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.nameLower = this.name.toLowerCase().trim();
  }
  next();
});

export default mongoose.model("Service", serviceSchema);
