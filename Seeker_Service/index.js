import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import postRoutes from "./routes/postRoutes.js";

dotenv.config();

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes
app.use("/api/posts", postRoutes);

const PORT = process.env.PORT || 6000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => console.log(err));