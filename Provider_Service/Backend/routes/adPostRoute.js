import express from "express";
import { generatePost } from "../controllers/adPostController.js";

const router = express.Router();

router.post("/generate-post", generatePost);

export default router;