import Post from "../models/Post.js";
import { analyzeImageWithGemini } from "../utils/gemini.js";
import fs from "fs";

export const createPost = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Image required" });
    }

    // 1️⃣ Convert image → base64
    const imageBase64 = fs
      .readFileSync(req.file.path)
      .toString("base64");

    // 2️⃣ CALL GEMINI AI (IMPORTANT PART)
    const aiData = await analyzeImageWithGemini(
      imageBase64,
      title,
      description
    );

    console.log("AI RESULT:", aiData);

    // 3️⃣ SAVE BEAUTIFUL POST
    const newPost = new Post({
      title: aiData.title,
      description: aiData.description,
      image: req.file.filename,
      category: aiData.category,
      tags: aiData.tags,
      urgency: aiData.urgency,
    });

    await newPost.save();

    res.status(201).json({
      success: true,
      post: newPost,
      aiGenerated: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};