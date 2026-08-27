import mongoose from "mongoose";

const applicantSchema = new mongoose.Schema(
  {
    applicantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    role: {
      type: String,
      enum: ["ServiceProvider", "Seeker"],
      default: "ServiceProvider",
    },
    name: { type: String, default: "" },
    profilePicture: { type: String, default: null },
    bidAmount: { type: Number, default: null },
    note: { type: String, default: "" },
  },
  { _id: false, timestamps: { createdAt: true, updatedAt: false } }
);

const posterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    profilePicture: { type: String, default: null },
    district: { type: String, default: "" },
    telephone: { type: String, default: "" },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    seekerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    image: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      default: "General",
    },

    tags: {
      type: [String],
      default: [],
    },

    urgency: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    poster: posterSchema,

    location: {
      address: {
        type: String,
        default: "",
      },
      district: {
        type: String,
        default: "",
      },
      city: {
        type: String,
        default: "",
      },
      lat: {
        type: Number,
        default: null,
      },
      lng: {
        type: Number,
        default: null,
      },
    },

    budget: {
      type: String,
      default: "",
    },

    appliedCount: {
      type: Number,
      default: 0,
      index: true,
    },

    appliedBy: {
      type: [applicantSchema],
      default: [],
    },

    views: {
      type: Number,
      default: 0,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

postSchema.index({ createdAt: -1 });
postSchema.index({ appliedCount: -1, createdAt: -1 });
postSchema.index({ "appliedBy.applicantId": 1 });

export default mongoose.model("Post", postSchema);
