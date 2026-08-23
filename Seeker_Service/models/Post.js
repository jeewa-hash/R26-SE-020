import mongoose from "mongoose";

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

export default mongoose.model("Post", postSchema);