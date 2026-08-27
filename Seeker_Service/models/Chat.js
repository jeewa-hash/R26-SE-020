import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    members: {
      type: [String],
      required: true,
    },
    // Store the last message directly (text + sender) for quick display
    lastMessage: {
      text: { type: String, default: "" },
      senderId: { type: String, default: "" },
    },
  },
  { timestamps: true } // updatedAt will auto‑update on save
);

export default mongoose.model("Chat", chatSchema);