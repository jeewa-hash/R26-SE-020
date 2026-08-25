import Post from "../models/Post.js";
import { analyzeImageWithGemini } from "../utils/gemini.js";
import fs from "fs";
import axios from "axios";


// =======================================================
// AUTH SERVICE URL
// =======================================================

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL || "http://localhost:4003";


// =======================================================
// GET USER FROM AUTH SERVICE
// =======================================================

const getUserById = async (userId) => {
  try {
    const response = await axios.get(
      `${AUTH_SERVICE_URL}/seeker/user/${userId}`
    );

    return response.data;

  } catch (error) {

    console.error(
      "AUTH SERVICE ERROR:",
      error.response?.data || error.message
    );

    return null;
  }
};

// =======================================================
// 1. GET ALL POSTSs
// =======================================================

export const getPosts = async (req, res) => {
  try {

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .lean();

    const postsWithUser = await Promise.all(
      posts.map(async (post) => {

        const user = await getUserById(post.userId);

        return {
          ...post,

          user: user
            ? {
                _id: user._id,
                name: user.name,
              }
            : null,
        };
      })
    );

    res.status(200).json({
      success: true,
      posts: postsWithUser,
    });

  } catch (error) {

    console.error("GET ALL POSTS ERROR:", error);

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

    const post = await Post.findById(req.params.id).lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    const user = await getUserById(post.userId);

    const postWithUser = {
      ...post,

      user: user
        ? {
            _id: user._id,
            name: user.name,
          }
        : null,
    };

    res.status(200).json({
      success: true,
      post: postWithUser,
    });

  } catch (error) {

    console.error("GET POST BY ID ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


// =======================================================
// 3. GET ALL POSTS BY USER ID
// =======================================================

export const getPostsByUserId = async (req, res) => {
  try {

    const { userId } = req.params;

    const posts = await Post.find({
      $or: [{ userId: userId }, { seekerId: userId }],
    })
      .sort({ createdAt: -1 })
      .lean();

    const user = await getUserById(userId);

    const postsWithUser = posts.map((post) => ({
      ...post,

      user: user
        ? {
            _id: user._id,
            name: user.name,
          }
        : null,
    }));

    res.status(200).json({
      success: true,
      posts: postsWithUser,
    });

  } catch (error) {

    console.error("GET POSTS BY USER ID ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


// =======================================================
// 4. PREVIEW POST WITH GEMINI
// =======================================================

export const previewPost = async (req, res) => {
  try {

    const {
      title,
      description,
    } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Image is required",
      });
    }

    const imageBase64 = fs
      .readFileSync(req.file.path)
      .toString("base64");

    const aiData = await analyzeImageWithGemini(
      imageBase64,
      title,
      description
    );

    res.status(200).json({
      success: true,

      preview: {

        title:
          aiData.title || title,

        description:
          aiData.description || description,

        image:
          req.file.path,

        category:
          aiData.category || "General",

        tags:
          aiData.tags || [],

        urgency:
          aiData.urgency || "medium",
      },
    });

  } catch (error) {

    console.error("PREVIEW POST ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


// =======================================================
// 5. PUBLISH FINAL POST
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
      userId,
      seekerId,
      location,
      preferredSchedule,
    } = req.body;

    const actualId = seekerId || userId;

    if (!actualId) {
      return res.status(400).json({
        success: false,
        error: "Seeker ID is required",
      });
    }


    // Check whether user exists
    const user = await getUserById(actualId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found in Auth Service",
      });
    }


    // Create post
    const newPost = new Post({
      seekerId: actualId,
      userId: actualId,
      title,
      description,
      image,
      category,
      tags,
      urgency,
      ...(location && { location }),
      ...(preferredSchedule && { preferredSchedule }),
    });


    await newPost.save();


    // Return post with user information
    const postResponse = {
      ...newPost.toObject(),

      user: {
        _id: user._id,
        name: user.name,
      },
    };


    res.status(201).json({
      success: true,
      message: "Post published successfully",
      post: postResponse,
    });

  } catch (error) {

    console.error("PUBLISH POST ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


// =======================================================
// 6. UPDATE POST
// =======================================================

export const updatePost = async (req, res) => {
  try {

    const post = await Post.findById(
      req.params.id
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }


    if (req.body.title !== undefined) {
      post.title = req.body.title;
    }

    if (req.body.description !== undefined) {
      post.description = req.body.description;
    }

    if (req.body.category !== undefined) {
      post.category = req.body.category;
    }

    if (req.body.urgency !== undefined) {
      post.urgency = req.body.urgency;
    }

    if (req.body.tags !== undefined) {
      post.tags = req.body.tags;
    }

    if (req.body.image !== undefined) {
      post.image = req.body.image;
    }


    await post.save();


    const user = await getUserById(
      post.userId
    );


    const postResponse = {
      ...post.toObject(),

      user: user
        ? {
            _id: user._id,
            name: user.name,
          }
        : null,
    };


    res.status(200).json({
      success: true,
      message: "Post updated successfully",
      post: postResponse,
    });

  } catch (error) {

    console.error("UPDATE POST ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};


// =======================================================
// 7. DELETE POST
// =======================================================

export const deletePost = async (req, res) => {
  try {

    const post = await Post.findById(
      req.params.id
    );

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }


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

    console.error("DELETE POST ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};