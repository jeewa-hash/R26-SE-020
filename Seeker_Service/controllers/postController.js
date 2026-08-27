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
// GET USER FROM AUTH SERVICE (SEEKER OR PROVIDER)
// =======================================================

const getUserById = async (userId, role = "seeker") => {
  try {
    const lowerRole = String(role || "seeker").toLowerCase();
    const path =
      lowerRole === "serviceprovider" || lowerRole === "provider"
        ? `provider/user/${userId}`
        : `seeker/user/${userId}`;

    const response = await axios.get(`${AUTH_SERVICE_URL}/${path}`);
    return response.data;
  } catch (error) {
    try {
      const altPath =
        lowerRole === "seeker"
          ? `provider/user/${userId}`
          : `seeker/user/${userId}`;
      const fallback = await axios.get(`${AUTH_SERVICE_URL}/${altPath}`);
      return fallback.data;
    } catch (_) {
      console.error(
        "AUTH SERVICE ERROR:",
        error.response?.data || error.message
      );
      return null;
    }
  }
};

// =======================================================
// BUILD USER ENRICHMENT OBJECT
// =======================================================

const buildUserInfo = (user, fallbackId = null) => {
  if (!user) {
    return {
      _id: fallbackId,
      name: "Unknown User",
      profilePicture: null,
      district: "",
      telephone: "",
    };
  }

  return {
    _id: user._id || user.id || fallbackId,
    name: user.name || user.fullName || user.userName || "Unknown User",
    profilePicture:
      user.profilePicture || user.profileImage || user.avatar || null,
    district: user.district || "",
    telephone: user.telephone || user.phone || user.contact || "",
  };
};

// =======================================================
// SANITIZE POST FOR NON-OWNERS — strip appliedBy list
// appliedCount remains visible to anyone.
// =======================================================

const sanitizePost = (postObj, { viewerId, ownerId }) => {
  const isOwner =
    !!viewerId &&
    !!ownerId &&
    String(viewerId) === String(ownerId);

  if (isOwner) return postObj;

  const { appliedBy, ...rest } = postObj;
  return rest;
};

// =======================================================
// GET OPTIONAL VIEWER ID FROM REQUEST
// Accepts ?viewerId=xxx query param (passed by UI when auth
// middleware isn't present in this service).
// =======================================================

const getViewerId = (req) => {
  if (req.query?.viewerId) return req.query.viewerId;
  if (req.body?.viewerId) return req.body.viewerId;
  if (req.user?.id) return req.user.id;
  if (req.user?._id) return req.user._id;
  return null;
};


// =======================================================
// 1. GET ALL POSTS (PUBLIC NEWS FEED)
// appliedBy is ALWAYS stripped here (anyone can see the count only)
// =======================================================

export const getPosts = async (req, res) => {
  try {

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .lean();

    const postsWithUser = await Promise.all(
      posts.map(async (post) => {

        let userInfo = post.poster
          ? {
              _id: post.userId || post.seekerId,
              name: post.poster.name,
              profilePicture: post.poster.profilePicture || null,
              district: post.poster.district || "",
              telephone: post.poster.telephone || "",
            }
          : null;

        if (!userInfo) {
          const rawUser = await getUserById(post.userId);
          userInfo = buildUserInfo(rawUser, post.userId);
        }

        return sanitizePost(
          {
            ...post,
            user: userInfo,
          },
          { viewerId: getViewerId(req), ownerId: post.userId }
        );
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
// appliedBy is shown ONLY when the viewer is the post owner
// =======================================================

export const getPostById = async (req, res) => {
  try {

    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    let userInfo = post.poster
      ? {
          _id: post.userId || post.seekerId,
          name: post.poster.name,
          profilePicture: post.poster.profilePicture || null,
          district: post.poster.district || "",
          telephone: post.poster.telephone || "",
        }
      : null;

    if (!userInfo) {
      const rawUser = await getUserById(post.userId);
      userInfo = buildUserInfo(rawUser, post.userId);
    }

    const viewerId = getViewerId(req);
    const ownerId = post.userId || post.seekerId;
    const isOwner =
      !!viewerId && !!ownerId && String(viewerId) === String(ownerId);

    const postResponse = sanitizePost(
      {
        ...post,
        user: userInfo,
        isOwner,
        applicants: isOwner ? post.appliedBy || [] : undefined,
      },
      { viewerId, ownerId }
    );

    res.status(200).json({
      success: true,
      post: postResponse,
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
// 3. GET ALL POSTS BY USER ID (OWNER'S LIST)
// appliedBy is shown because it's the user's own posts
// =======================================================

export const getPostsByUserId = async (req, res) => {
  try {

    const { userId } = req.params;

    const posts = await Post.find({
      $or: [{ userId: userId }, { seekerId: userId }],
    })
      .sort({ createdAt: -1 })
      .lean();

    const rawUser = await getUserById(userId);
    const userInfo = buildUserInfo(rawUser, userId);

    const postsWithUser = posts.map((post) => ({
      ...post,
      user: post.poster
        ? {
            _id: post.userId || post.seekerId,
            name: post.poster.name,
            profilePicture: post.poster.profilePicture || null,
            district: post.poster.district || "",
            telephone: post.poster.telephone || "",
          }
        : userInfo,
      applicants: post.appliedBy || [],
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
// Embed poster info so we don't have to hit the auth
// service on every read, and we have a historical
// snapshot of who created it.
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
    const user = await getUserById(userId);

    if (!rawUser) {
      return res.status(404).json({
        success: false,
        error: "User not found in Auth Service",
      });
    }

    const userInfo = buildUserInfo(rawUser, userId);

    const posterEmbed = {
      name: userInfo.name,
      profilePicture: userInfo.profilePicture,
      district: userInfo.district,
      telephone: userInfo.telephone,
    };

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
      userId,
    });


    await newPost.save();


    // Return post with user information
    const postResponse = {
      ...newPost.toObject(),

      user: userInfo,
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

    if (req.body.budget !== undefined) {
      post.budget = req.body.budget;
    }

    if (req.body.location !== undefined) {
      post.location = { ...post.location, ...req.body.location };
    }


    await post.save();


    const rawUser = await getUserById(
      post.userId
    );

    const userInfo = buildUserInfo(rawUser, post.userId);


    const postResponse = {
      ...post.toObject(),

      user: userInfo,
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


// =======================================================
// 8. APPLY TO POST — store applicant info in appliedBy[]
//    and increment appliedCount.
// Request body:
//   { providerId, applicantName?, applicantProfilePicture?,
//     bidAmount?, note?, role? }
// =======================================================

export const applyPost = async (req, res) => {
  try {

    const { id } = req.params;
    const {
      providerId,
      amount,
      applicantName,
      applicantProfilePicture,
      bidAmount,
      note,
      role,
    } = req.body;

    const applicantId = providerId || req.body.applicantId;

    if (!applicantId) {
      return res.status(400).json({
        success: false,
        error: "Applicant / Provider ID is required",
      });
    }

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    // Try to enrich applicant info from auth service;
    // fall back to values provided in the request body.
    let applicantInfo = {
      name: applicantName || "",
      profilePicture: applicantProfilePicture || null,
    };

    const rawApplicant = await getUserById(
      applicantId,
      role || "ServiceProvider"
    );
    if (rawApplicant) {
      const enriched = buildUserInfo(rawApplicant, applicantId);
      applicantInfo.name = applicantInfo.name || enriched.name;
      applicantInfo.profilePicture =
        applicantInfo.profilePicture || enriched.profilePicture;
    }

    const applicantRole =
      role === "Seeker" ? "Seeker" : "ServiceProvider";

    const newApplicant = {
      applicantId,
      role: applicantRole,
      name: applicantInfo.name || "Service Provider",
      profilePicture: applicantInfo.profilePicture,
      bidAmount: typeof bidAmount === "number" ? bidAmount : null,
      note: note || "",
    };

    // Remove if this applicant already exists (prevent duplicates)
    // then add the fresh entry with current timestamp + latest details
    const deduped = (post.appliedBy || []).filter(
      (a) => String(a.applicantId) !== String(applicantId)
    );

    deduped.push(newApplicant);
    post.appliedBy = deduped;
    post.appliedCount = deduped.length;
    await post.save();

    const incrementAmount =
      amount && amount > 0 ? Number(amount) : 0;
    if (incrementAmount > 0) {
      // Legacy support: extra bonus bumps appliedCount more
      post.appliedCount = (post.appliedCount || deduped.length) + (incrementAmount - 1);
      await post.save();
    }

    const rawOwner = await getUserById(post.userId);
    const ownerInfo = buildUserInfo(rawOwner, post.userId);

    const viewerId = getViewerId(req) || applicantId;
    const ownerId = post.userId || post.seekerId;
    const isOwner =
      !!viewerId && !!ownerId && String(viewerId) === String(ownerId);

    const postLean = post.toObject();
    const postResponse = sanitizePost(
      {
        ...postLean,
        user: ownerInfo,
        isOwner,
        applicants: isOwner ? postLean.appliedBy || [] : undefined,
      },
      { viewerId, ownerId }
    );

    res.status(200).json({
      success: true,
      message: "Applied successfully",
      post: postResponse,
      appliedCount: post.appliedCount,
      alreadyApplied: deduped.length - 1 !== (post.appliedBy || []).length - 1
        ? false
        : false,
    });

  } catch (error) {

    console.error("APPLY POST ERROR:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
