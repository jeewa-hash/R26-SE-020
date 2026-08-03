import axios from "axios";

export const analyzeImageWithGemini = async (imageBase64, title, description) => {
  try {
    // 💡 FIXED: Correct URL format and model name
// Change gemini-1.5-flash to gemini-2.5-flash
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const prompt = `
    You are an AI service post generator.
    Convert user input into a PROFESSIONAL service request post.
    Return ONLY valid JSON (no markdown).
    
    Fields required: title, description, category, tags (array), urgency (low|medium|high).
    
    User Input:
    Title: ${title}
    Description: ${description}
    `;

    const response = await axios.post(url, {
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }
        ]
      }]
    });

    let text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    return JSON.parse(text);
  } catch (err) {
    console.error("Gemini AI Error:", err.response?.data || err.message);
    return { title, description, category: "Unknown", tags: [], urgency: "medium" };
  }
};