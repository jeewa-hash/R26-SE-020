// debug_models.js
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const listModels = async () => {
  try {
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    );
    console.log("AVAILABLE MODELS:", response.data.models.map(m => m.name));
  } catch (error) {
    console.error("Error listing models:", error.response?.data || error.message);
  }
};

listModels();