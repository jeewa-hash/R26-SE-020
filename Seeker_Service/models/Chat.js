import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    members: {
      type: [String],
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Chat", chatSchema);