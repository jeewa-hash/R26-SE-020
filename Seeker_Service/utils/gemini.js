import axios from "axios";

export const analyzeImageWithGemini = async (
  imageBase64,
  title,
  description
) => {
  try {

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    const prompt = `
You are an AI service post generator.

Convert the user input into a PROFESSIONAL public service request post.

Return ONLY valid JSON.

Required JSON format:

{
  "title": "",
  "description": "",
  "category": "",
  "tags": [],
  "urgency": "low | medium | high"
}

User Input:
Title: ${title}
Description: ${description}
`;

    const response = await axios.post(url, {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: prompt,
            },

            {
              inlineData: {
                mimeType: "image/jpeg",
                data: imageBase64,
              },
            },
          ],
        },
      ],
    });

    let text =
      response.data?.candidates?.[0]
        ?.content?.parts?.[0]?.text || "{}";

    // Remove markdown if Gemini adds it
    text = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    return JSON.parse(text);

  } catch (err) {

    console.error(
      "Gemini AI Error:",
      err.response?.data || err.message
    );

    return {
      title,
      description,
      category: "General",
      tags: [],
      urgency: "medium",
    };
  }
};