import Post from "../models/Post.js";
import { analyzeImageWithGemini } from "../utils/gemini.js";
import fs from "fs";
import path from "path";

// 1. GET ALL POSTS
export const getPosts = async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. GET SINGLE POST
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. CREATE POST (Your existing code)
export const createPost = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!req.file) return res.status(400).json({ error: "Image required" });

    const imageBase64 = fs.readFileSync(req.file.path).toString("base64");
    const aiData = await analyzeImageWithGemini(imageBase64, title, description);

    const newPost = new Post({
      title: aiData.title || title,
      description: aiData.description || description,
      image: req.file.path,
      category: aiData.category || "General",
      tags: aiData.tags || [],
      urgency: aiData.urgency || "medium",
    });

    await newPost.save();
    res.status(201).json({ success: true, post: newPost });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. UPDATE POST (Edit)
export const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    // If user uploads a new image, delete the old one from storage
    if (req.file) {
      if (fs.existsSync(post.image)) {
        fs.unlinkSync(post.image);
      }
      post.image = req.file.path; // Update with new file path
    }

    // Update text fields
    post.title = req.body.title || post.title;
    post.description = req.body.description || post.description;
    post.category = req.body.category || post.category;
    post.urgency = req.body.urgency || post.urgency;

    await post.save();
    res.status(200).json({ success: true, post });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. DELETE POST
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    // Delete the image file from the server
    if (fs.existsSync(post.image)) {
      fs.unlinkSync(post.image);
    }

    await Post.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Post deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};