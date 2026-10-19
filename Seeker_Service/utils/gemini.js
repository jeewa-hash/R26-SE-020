import axios from "axios";

const getGeminiUrl = () =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
const EMBEDDING_MODEL = "gemini-embedding-2";
const embeddingCache = new Map();
const postPipelineLog = (event, details = {}) => {
  if (process.env.POST_PIPELINE_DEBUG === "true") {
    console.info(`[post-pipeline] ${event}`, details);
  }
};

const tokenize = (value) =>
  String(value || "")
    .toLocaleLowerCase()
    .normalize("NFC")
    .match(/[\p{L}\p{N}]{2,}/gu) || [];

const cosineSimilarity = (left = [], right = []) => {
  if (!left.length || left.length !== right.length) return 0;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }
  return leftNorm && rightNorm ? dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm)) : 0;
};

const getTextEmbeddings = async (texts) => {
  const uniqueTexts = [...new Set(texts.filter(Boolean))];
  const missing = uniqueTexts.filter((text) => !embeddingCache.has(text));
  postPipelineLog("rag.embeddings_requested", {
    inputCount: uniqueTexts.length,
    cacheHitCount: uniqueTexts.length - missing.length,
    apiRequestCount: missing.length,
  });
  if (missing.length) {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents`,
      {
        requests: missing.map((text) => ({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text }] },
        })),
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        timeout: 20000,
      }
    );
    const vectors = response.data?.embeddings || [];
    if (vectors.length !== missing.length) throw new Error("Embedding response count mismatch");
    missing.forEach((text, index) => {
      embeddingCache.set(text, vectors[index].values || []);
      if (embeddingCache.size > 500) embeddingCache.delete(embeddingCache.keys().next().value);
    });
    postPipelineLog("rag.embeddings_received", { embeddingCount: vectors.length });
  }
  return uniqueTexts.map((text) => embeddingCache.get(text) || []);
};

// Combine Sinhala/English lexical overlap with cross-language semantic search.
export const rankRelevantPosts = async (query, posts = [], limit = 3) => {
  const queryText = `task: search result | query: ${query}`;
  const documentTexts = posts.map((post) => {
    const body = `${post.description || ""} | category: ${post.category || ""} | tags: ${(post.tags || []).join(" ")}`;
    return `title: ${post.title || "none"} | text: ${body}`;
  });
  const [queryVector, ...documentVectors] = await getTextEmbeddings([queryText, ...documentTexts]);
  const queryTerms = new Set(tokenize(query));

  return posts
    .map((post, index) => {
      const postTerms = new Set(tokenize(documentTexts[index]));
      const overlap = [...queryTerms].filter((term) => postTerms.has(term)).length;
      const lexicalScore = overlap / Math.sqrt(Math.max(1, queryTerms.size * postTerms.size));
      const semanticScore = Math.max(0, cosineSimilarity(queryVector, documentVectors[index]));
      return { post, score: 0.65 * semanticScore + 0.35 * lexicalScore, semanticScore, lexicalScore };
    })
    .filter((item) => item.semanticScore >= 0.35 || item.lexicalScore > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

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
      ? candidate.tags.filter((tag) => typeof tag === "string").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean).slice(0, 10)
      : Array.isArray(fallback.tags) ? fallback.tags : [],
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
  const manualDescription = [
    source.title && `Requested service: ${source.title}`,
    source.description && `Details provided: ${source.description}`,
    source.location && `Service location: ${source.location}`,
    source.requiredDate && `Preferred date: ${source.requiredDate}`,
    source.urgency && `Urgency: ${source.urgency}`,
  ].filter(Boolean).join("\n");
  const languageInstruction = language === "si"
    ? "Write the title and description in Sinhala. Keep category, urgency, and tags in English."
    : "Write the title and description in English.";
  const sourceBlock = JSON.stringify(source);
  const generationPrompt = `You are a professional service-request copywriter. Improve the MANUAL_DRAFT_DESCRIPTION into a concise, clear, professional post that helps a service provider understand the request. Improve grammar, organization, and tone while preserving the user's meaning and all supplied details. Treat SOURCE_DATA and the attached image as the only evidence about this request. Do not invent scope, measurements, condition, budget, availability, or promises. Use retrieved context only for relevant personalization; never copy its facts as facts about this request. Use the image only to clarify the request and do not claim details that are not clearly visible.\n${languageInstruction}\nReturn valid JSON only with title (short and specific), description (polished request), category (short service category), tags (3 to 8 concise relevant English keywords without #), and urgency (low|medium|high).\nRETRIEVED_CONTEXT:\n${contextData || "No relevant prior context."}\nSOURCE_DATA:\n${sourceBlock}\nMANUAL_DRAFT_DESCRIPTION:\n${manualDescription || "No text details supplied; use only the attached image and structured source data."}`;

  postPipelineLog("generation.started", {
    language,
    hasTitle: Boolean(source.title),
    hasManualDescription: Boolean(manualDescription),
    hasRetrievedContext: Boolean(contextData),
    hasImage: Boolean(imageBase64),
  });

  try {
    const draft = await requestGeminiJson(generationPrompt, imageBase64);
    postPipelineLog("generation.draft_received", {
      hasTitle: Boolean(draft?.title),
      hasDescription: Boolean(draft?.description),
      tagCount: Array.isArray(draft?.tags) ? draft.tags.length : 0,
    });
    const reviewPrompt = `Refine this draft for professional clarity. Preserve the user's meaning and every supplied fact. Use only SOURCE_DATA and clearly visible image evidence; remove unsupported claims, do not invent details, and do not treat retrieved history as factual evidence. Keep tags relevant (3 to 8 concise English keywords without #). ${languageInstruction} Return valid JSON only with title, description, category, tags (array), and urgency (low|medium|high).\nSOURCE_DATA:\n${sourceBlock}\nDRAFT_TO_REVIEW:\n${JSON.stringify(draft)}`;

    try {
      const reviewed = await requestGeminiJson(reviewPrompt, imageBase64);
      const normalized = normalizePost(reviewed, source, draft);
      postPipelineLog("generation.review_completed", {
        hasTitle: Boolean(normalized.title),
        hasDescription: Boolean(normalized.description),
        tagCount: normalized.tags.length,
      });
      return normalized;
    } catch (reviewError) {
      // Keep a successful draft if the optional review call hits a rate limit.
      postPipelineLog("generation.review_failed_using_draft", {
        code: reviewError.code || "unknown",
        status: reviewError.response?.status || null,
      });
      return normalizePost(draft, source);
    }
  } catch (err) {
    postPipelineLog("generation.failed_using_manual_description", {
      code: err.code || "unknown",
      status: err.response?.status || null,
    });
      return normalizePost({}, source, { description: manualDescription, category: "General", tags: [] });
  }
};
