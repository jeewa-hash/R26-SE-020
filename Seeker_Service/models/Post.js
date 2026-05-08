import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  title: String,
  description: String,
  image: String,
  category: String,
  tags: [String],
  urgency: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Post", postSchema);