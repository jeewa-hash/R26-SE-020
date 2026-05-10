import Post from "../models/Post.js";
import { analyzeImageWithGemini } from "../utils/gemini.js";
import fs from "fs";

// =======================================================
// 1. GET ALL POSTS
// =======================================================
export const getPosts = async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      posts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// =======================================================
// 2. GET SINGLE POST
// =======================================================
export const getPostById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    res.status(200).json({
      success: true,
      post,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// =======================================================
// 3. PREVIEW POST WITH GEMINI (NOT SAVE)
// =======================================================
export const previewPost = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Image is required",
      });
    }

    // Read uploaded image
    const imageBase64 = fs
      .readFileSync(req.file.path)
      .toString("base64");

    // Analyze with Gemini
    const aiData = await analyzeImageWithGemini(
      imageBase64,
      title,
      description
    );

    // Return AI-generated preview
    res.status(200).json({
      success: true,
      preview: {
        title: aiData.title || title,
        description:
          aiData.description || description,

        image: req.file.path,

        category:
          aiData.category || "General",

        tags: aiData.tags || [],

        urgency:
          aiData.urgency || "medium",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// =======================================================
// 4. PUBLISH FINAL POST
// =======================================================
export const publishPost = async (req, res) => {
  try {
    const {
      title,
      description,
      image,
      category,
      tags,
      urgency,
    } = req.body;

    const newPost = new Post({
      title,
      description,
      image,
      category,
      tags,
      urgency,
    });

    await newPost.save();

    res.status(201).json({
      success: true,
      message: "Post published successfully",
      post: newPost,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// =======================================================
// 5. UPDATE POST
// =======================================================
export const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    // Replace image if new image uploaded
    if (req.file) {
      // Delete old image
      if (
        post.image &&
        fs.existsSync(post.image)
      ) {
        fs.unlinkSync(post.image);
      }

      post.image = req.file.path;
    }

    // Update fields
    post.title =
      req.body.title || post.title;

    post.description =
      req.body.description ||
      post.description;

    post.category =
      req.body.category ||
      post.category;

    post.urgency =
      req.body.urgency ||
      post.urgency;

    // Update tags
    if (req.body.tags) {
      post.tags = req.body.tags;
    }

    await post.save();

    res.status(200).json({
      success: true,
      message: "Post updated successfully",
      post,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// =======================================================
// 6. DELETE POST
// =======================================================
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    // Delete image from uploads folder
    if (
      post.image &&
      fs.existsSync(post.image)
    ) {
      fs.unlinkSync(post.image);
    }

    await Post.findByIdAndDelete(
      req.params.id
    );

    res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};