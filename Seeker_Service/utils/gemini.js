import axios from "axios";

export const analyzeImageWithGemini = async (
  imageBase64,
  title,
  description
) => {
  try {
    const prompt = `
You are an AI service post generator.

Convert user input into a PROFESSIONAL service request post.

Rules:
- Return ONLY valid JSON
- No markdown, no text explanation
- Improve title professionally
- Improve description clearly
- Add relevant tags (5–10)
- Detect category (Plumbing, Electrical, Furniture, Cleaning, etc.)
- Set urgency: low | medium | high

User Input:
Title: ${title}
Description: ${description}

Return format:
{
  "title": "",
  "description": "",
  "category": "",
  "tags": [],
  "urgency": ""
}
`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              ...(imageBase64
                ? [
                    {
                      inline_data: {
                        mime_type: "image/jpeg",
                        data: imageBase64,
                      },
                    },
                  ]
                : []),
            ],
          },
        ],
      }
    );

    let text =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // clean JSON
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(text);

    return {
      title: parsed.title || title,
      description: parsed.description || description,
      category: parsed.category || "Unknown",
      tags: parsed.tags || [],
      urgency: parsed.urgency || "medium",
    };
  } catch (err) {
    console.error("Gemini error:", err.response?.data || err.message);

    return {
      title,
      description,
      category: "Unknown",
      tags: [],
      urgency: "medium",
    };
  }
};