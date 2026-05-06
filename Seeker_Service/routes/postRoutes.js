import express from "express";
import { upload } from "../middleware/upload.js";
import { createPost } from "../controllers/postController.js";

const router = express.Router();

router.post("/create", upload.single("image"), createPost);

export default router;