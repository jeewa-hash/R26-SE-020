import axios from "axios";
import { buildPrompt } from "./promptService.js";

const API_URL =
"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export const generateAIContent = async (data) => {

  const prompt = buildPrompt(data);

  const response = await axios.post(
    `${API_URL}?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    }
  );

  const text =
    response.data.candidates[0]
    .content.parts[0].text;

  return {
    generatedPost: text
  };

};