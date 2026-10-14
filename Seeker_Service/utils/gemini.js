import axios from "axios";

const getGeminiUrl = () =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

const parseModelJson = (response) => {
  let text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  return JSON.parse(text);
};

const requestGeminiJson = async (prompt, imageBase64 = null) => {
  const response = await axios.post(getGeminiUrl(), {
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        ...(imageBase64 ? [{ inline_data: { mime_type: "image/jpeg", data: imageBase64 } }] : []),
      ],
    }],
    generationConfig: { responseMimeType: "application/json" },
  });
  return parseModelJson(response);
};

const normalizePost = (candidate, source, fallback = {}) => {
  const allowedUrgencies = new Set(["low", "medium", "high"]);
  const modelUrgency = String(candidate?.urgency || "").toLowerCase();
  return {
    title: String(candidate?.title || fallback.title || source.title || "Service request").trim(),
    description: String(candidate?.description || fallback.description || source.description || "").trim(),
    category: String(candidate?.category || fallback.category || "General").trim(),
    tags: Array.isArray(candidate?.tags)
      ? candidate.tags.filter((tag) => typeof tag === "string").slice(0, 10)
      : [],
    // User-provided values are authoritative over model suggestions.
    urgency: source.urgency || (allowedUrgencies.has(modelUrgency) ? modelUrgency : "medium"),
    location: source.location || "",
    requiredDate: source.requiredDate || "",
  };
};

export const analyzeImageWithGemini = async (
  imageBase64,
  title,
  description,
  contextData = "",
  language = "en",
  details = {}
) => {
  const source = {
    title: String(title || "").trim(),
    description: String(description || "").trim(),
    location: String(details.location || "").trim(),
    urgency: String(details.urgency || "").trim().toLowerCase(),
    requiredDate: String(details.requiredDate || "").trim(),
  };
  const languageInstruction = language === "si"
    ? "Write the title and description in Sinhala. Keep category, urgency, and tags in English."
    : "Write the title and description in English.";
  const sourceBlock = JSON.stringify(source);
  const generationPrompt = `Create a clear service-request post. Return only JSON with title, description, category, tags (array), and urgency (low|medium|high).\n${languageInstruction}\nUse retrieved context only for relevant personalization. Do not copy facts from prior posts as if they describe this request. Do not invent facts, prices, dates, damage, or promises. Preserve facts from SOURCE_DATA.\nRETRIEVED_CONTEXT:\n${contextData || "No relevant prior context."}\nSOURCE_DATA:\n${sourceBlock}`;

  try {
    const draft = await requestGeminiJson(generationPrompt, imageBase64);
    const reviewPrompt = `Review and refine this draft using only SOURCE_DATA and the attached image as evidence. Remove unsupported claims, resolve contradictions in favor of SOURCE_DATA, preserve every supplied detail, and do not add facts from retrieved history. Return only JSON with title, description, category, tags (array), and urgency (low|medium|high).\nSOURCE_DATA:\n${sourceBlock}\nDRAFT_TO_REVIEW:\n${JSON.stringify(draft)}`;

    try {
      const reviewed = await requestGeminiJson(reviewPrompt, imageBase64);
      return normalizePost(reviewed, source, draft);
    } catch (reviewError) {
      // Keep a successful draft if the optional review call hits a rate limit.
      console.warn(
        "Gemini review failed; using the generated draft:",
        reviewError.response?.data || reviewError.message
      );
      return normalizePost(draft, source);
    }
  } catch (err) {
    console.error("Gemini AI generation error:", err.response?.data || err.message);
    return normalizePost({}, source, { category: "General", tags: [] });
  }
};
