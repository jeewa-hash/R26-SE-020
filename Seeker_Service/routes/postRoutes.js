import express from "express";

import { upload } from "../middleware/upload.js";

import {
  getPosts,
  getPostById,
  previewPost,
  publishPost,
  updatePost,
  deletePost,
} from "../controllers/postController.js";

const router = express.Router();

// =======================================================
// GET ALL POSTS
// =======================================================
router.get("/", getPosts);

// =======================================================
// GET SINGLE POST
// =======================================================
router.get("/:id", getPostById);

// =======================================================
// PREVIEW POST WITH GEMINI
// Upload image + AI generates content
// NOT SAVED YET
// =======================================================
router.post(
  "/preview",
  upload.single("image"),
  previewPost
);

// =======================================================
// FINAL PUBLISH POST
// User confirms AI result
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
  upload.single("image"),
  updatePost
);

// =======================================================
// DELETE POST
// =======================================================
router.delete(
  "/delete/:id",
  deletePost
);

export default router;