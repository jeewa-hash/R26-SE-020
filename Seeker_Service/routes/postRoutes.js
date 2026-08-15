import express from "express";
import { upload } from "../middleware/upload.js";
import { 
  getPosts, 
  getPostById, 
  createPost, 
  updatePost, 
  deletePost 
} from "../controllers/postController.js";

const router = express.Router();

router.get("/", getPosts);              // Read All
router.get("/:id", getPostById);        // Read One
router.post("/create", upload.single("image"), createPost); // Create
router.put("/update/:id", upload.single("image"), updatePost); // Update
router.delete("/delete/:id", deletePost); // Delete

export default router;