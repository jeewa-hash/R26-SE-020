import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  seekerId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  title: String,
  description: String,
  image: String,
  category: String,
  tags: [String],
  urgency: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Post", postSchema);