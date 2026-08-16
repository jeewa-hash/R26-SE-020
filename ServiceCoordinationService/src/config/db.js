import mongoose from "mongoose";
import logger from "../utils/logger.js";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    logger.info("MongoDB connected successfully");
  } catch (error) {
    logger.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};