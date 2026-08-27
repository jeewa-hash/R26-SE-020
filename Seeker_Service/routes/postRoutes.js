import express from "express";

import { upload } from "../middleware/upload.js";

import {
  getPosts,
  getPostById,
  getPostsByUserId,
  previewPost,
  publishPost,
  updatePost,
  deletePost,
  applyPost,
} from "../controllers/postController.js";


const router = express.Router();


// =======================================================
// GET ALL POSTS
// =======================================================

router.get(
  "/",
  getPosts
);


// =======================================================
// GET POSTS BY USER ID
// IMPORTANT:
// This MUST be before /:id
// =======================================================

router.get(
  "/user/:userId",
  getPostsByUserId
);


// =======================================================
// GET SINGLE POST
// =======================================================

router.get(
  "/:id",
  getPostById
);


// =======================================================
// PREVIEW POST WITH GEMINI
// =======================================================

router.post(
  "/preview",
  upload.single("image"),
  previewPost
);


// =======================================================
// PUBLISH FINAL POST
// =======================================================

router.post(
  "/publish",
  publishPost
);


// =======================================================
// UPDATE POST
// =======================================================

router.put(
  "/update/:id",
  updatePost
);


// =======================================================
// DELETE POST
// =======================================================

router.delete(
  "/delete/:id",
  deletePost
);


// =======================================================
// APPLY TO POST (INCREMENT appliedCount)
// =======================================================

router.post(
  "/:id/apply",
  applyPost
);


export default router;