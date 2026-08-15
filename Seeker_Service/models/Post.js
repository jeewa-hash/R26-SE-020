import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
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

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Post", postSchema);