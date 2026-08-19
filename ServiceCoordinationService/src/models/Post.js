import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  seekerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },

  title: String,
  description: String,
  image: String,
  category: String,
  tags: [String],
  urgency: String,

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

  preferredSchedule: {
    date: {
      type: String,
      default: "",
    },
    startTime: {
      type: String,
      default: "",
    },
    endTime: {
      type: String,
      default: "",
    },
    flexible: {
      type: Boolean,
      default: true,
    },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Post", postSchema);