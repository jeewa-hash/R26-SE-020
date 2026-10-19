/**
 * services/geminiServices.js
 * Calls Gemini to generate structured, per-platform, multilingual ad posts.
 * Includes retry logic and a deterministic fallback generator so requests never
 * fully fail when Gemini is overloaded.
 */

import axios from "axios";
import { buildPrompt } from "./promptService.js";

const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 1500; // doubles: 1.5s, 3s, 6s, 12s

const stripCodeFences = (text) =>
  text.replace(/```json/gi, "").replace(/```/g, "").trim();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Determine if the error is transient (retryable). Covers common patterns from
// "this model is currently experiencing high demand", 429, 503, gateway errors.
const isRetryableError = (err) => {
  const status = err.response?.status;
  const message =
    (err.response?.data?.error?.message || err.message || "").toLowerCase();

  if ([429, 500, 502, 503, 504].includes(status)) return true;
  if (
    message.includes("high demand") ||
    message.includes("resource exhausted") ||
    message.includes("rate limit") ||
    message.includes("try again") ||
    message.includes("temporarily") ||
    message.includes("overloaded") ||
    message.includes("internal error") ||
    message.includes("server error")
  ) {
    return true;
  }
  return false;
};

const callGemini = async (prompt) => {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await axios.post(`${API_URL}?key=${process.env.GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          responseMimeType: "application/json",
        },
      });
    } catch (err) {
      lastErr = err;
      if (isRetryableError(err) && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `⚠️  Gemini transient error (attempt ${attempt}/${MAX_RETRIES}): ${err.response?.status || err.message}. Retrying in ${delay}ms...`
        );
        await sleep(delay);
        continue;
      }
      break;
    }
  }
  throw lastErr;
};

// ── Fallback: deterministic (template-based) post generator ────
// Used when Gemini is unreachable. Produces a reasonable post so the
// user can still publish instead of seeing a hard failure.
const TRANSLATIONS = {
  en: {
    facebookTitle: (label) => `Professional ${label} Services You Can Trust`,
    instagramTitle: (label) => `${label} Done Right ✨`,
    caption: (provider, label, extra, tone, loc, contact) => {
      const tonePrefix = {
        professional: "Quality workmanship guaranteed. ",
        friendly: "Hey there! 👋 ",
        urgent: "🚨 Need it fast? We're ready today! ",
        promotional: "🔥 Special offer available this week! ",
        trustworthy: "✅ 100% satisfaction promise. ",
      }[tone] || "";
      return [
        `${tonePrefix}${provider} is now offering ${label} services in ${loc}.`,
        extra ? `${extra}` : "",
        `Contact ${contact} today to book your slot and get a free quote.`,
        `#${label.replace(/\s+/g, '')} #LocalServices #${loc.split(/\s|,/)[0] || 'Services'} #QualityWork`,
      ].filter(Boolean).join("\n\n");
    },
  },
  si: {
    facebookTitle: (label) => `විශ්වාසනීය ${label} සේවා`,
    instagramTitle: (label) => `${label} හොඳින් කරමු ✨`,
    caption: (provider, label, extra, tone, loc, contact) => {
      return [
        `${provider} විසින් ${loc} ප්‍රදේශයේ ${label} සේවා සපයනු ලැබේ.`,
        extra ? extra : "",
        `ඔබගේ කාර්යය today වටන් පැවරීමට අදම ${label} අමතන්න: ${contact}`,
        `#${label.replace(/\s+/g, '')} #ස්ථානීයසේවා #ගෘහසේවා`,
      ].filter(Boolean).join("\n\n");
    },
  },
  ta: {
    facebookTitle: (label) => `நம்பகமான ${label} சேவைகள்`,
    instagramTitle: (label) => `${label} சரியாக செய்கிறோம் ✨`,
    caption: (provider, label, extra, tone, loc, contact) => {
      return [
        `${provider} ${loc} பகுதியில் ${label} சேவைகளை வழங்குகிறார்.`,
        extra ? extra : "",
        `இன்றே ${contact} ஐ தொடர்பு கொள்ளவும்.`,
        `#${label.replace(/\s+/g, '')} #உள்ளூர்சேவைகள் #தரமானவேலை`,
      ].filter(Boolean).join("\n\n");
    },
  },
};

export const generateFallbackContent = (adData) => {
  const lang = adData.language || "en";
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const platforms = Array.isArray(adData.platforms) && adData.platforms.length
    ? adData.platforms
    : ["facebook", "instagram"];
  const extraInfo = adData.extraInfo || "";
  const label = adData.specificLabel || adData.serviceLabel || "Service";
  const provider = adData.providerName || "Our Team";
  const loc = adData.location || "your area";
  const contact = adData.contact || "us directly";
  const tone = adData.tone || "professional";
  const hashtags = Array.isArray(adData.tags)
    ? adData.tags.map((t) => t.replace(/^#/, ""))
    : [];

  return platforms.map((platform) => {
    const title = platform === "instagram"
      ? t.instagramTitle(label)
      : t.facebookTitle(label);
    const caption = t.caption(provider, label, extraInfo, tone, loc, contact);
    const tagStr = caption.match(/#[^\s]+/g) || [];
    return {
      platform,
      title,
      caption,
      hashtags: [...new Set([...hashtags, ...tagStr.map((s) => s.slice(1))])],
    };
  });
};

export const generateAIContent = async (adData) => {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️  GEMINI_API_KEY not set — using fallback generator.");
    return generateFallbackContent(adData);
  }

  try {
    const prompt = buildPrompt(adData);
    const response = await callGemini(prompt);

    const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error("Gemini returned no content");
    }

    let parsed;
    try {
      parsed = JSON.parse(stripCodeFences(rawText));
    } catch (err) {
      throw new Error(`Failed to parse Gemini response as JSON: ${err.message}`);
    }

    if (!parsed.posts || !Array.isArray(parsed.posts)) {
      throw new Error("Gemini response is missing a 'posts' array");
    }

    return parsed.posts.map((p) => ({
      platform: p.platform,
      title: p.title || "",
      caption: p.caption || "",
      hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
    }));
  } catch (err) {
    console.warn(
      `⚠️  Gemini generation failed after retries. Falling back to template content. Reason: ${err.message}`
    );
    return generateFallbackContent(adData);
  }
};

export const generateServiceDetailsWithGemini = async ({ name, category, categoryGroup, language = "en" }) => {
  const langPromptInstruction = {
    si: `LANGUAGE INSTRUCTION: Write the "description", "name", and "tags" entirely in natural, fluent, and professional Sinhala (සිංහල බසින්). Ensure standard Sinhala spelling and clear sentence structure suitable for clients in Sri Lanka.`,
    ta: `LANGUAGE INSTRUCTION: Write the "description", "name", and "tags" entirely in natural, fluent, and professional Tamil (தமிழ் மொழியில்). Ensure standard Tamil spelling and polite tone suitable for clients in Sri Lanka.`,
    en: `LANGUAGE INSTRUCTION: Write the "description", "name", and "tags" in fluent, professional English.`,
  }[language] || `LANGUAGE INSTRUCTION: Write in fluent, professional English.`;

  const prompt = `You are a professional service business consultant for local home and trade services in Sri Lanka.
Create detailed, appealing, and realistic service details for a service provider.
Service Name: "${name || category || 'Home Service'}"
Category: "${category || 'home service'}"
Category Group: "${categoryGroup || 'other'}"

${langPromptInstruction}

Respond in STRICT JSON with no markdown formatting or code blocks:
{
  "name": "Refined professional service name (in requested language)",
  "description": "Write a compelling 2-3 paragraph professional service description in the requested language. Highlight the scope of work, what is included, high standards of quality and safety, professional equipment used, reliability, and full customer satisfaction guarantee.",
  "category": "${category || 'home service'}",
  "categoryGroup": "${categoryGroup || 'other'}",
  "suggestedBasePrice": 2500,
  "priceUnit": "job",
  "tags": ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5"]
}

The suggestedBasePrice must be a realistic number in Sri Lankan Rupees (LKR) between 1500 and 15000.
The priceUnit must be one of: "hour", "day", "job", "sqft", "item".
Tags must be an array of 4-6 short phrases in the requested language.`;

  try {
    const response = await callGemini(prompt);
    const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error("Gemini returned no content");
    const parsed = JSON.parse(stripCodeFences(rawText));

    return {
      name: parsed.name || name || "Professional Service",
      description: parsed.description || "",
      category: parsed.category || category || "home service",
      categoryGroup: parsed.categoryGroup || categoryGroup || "other",
      basePrice: Number(parsed.suggestedBasePrice || parsed.basePrice) || 2500,
      priceUnit: ["hour", "day", "job", "sqft", "item"].includes(parsed.priceUnit) ? parsed.priceUnit : "job",
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  } catch (err) {
    console.warn("⚠️ Gemini service generation failed, using intelligent fallback:", err.message);
    const svcName = name || category || "Professional Home Service";

    if (language === "si") {
      return {
        name: svcName,
        description: `විශ්වාසනීය හා උසස් තත්ත්වයේ ${svcName} සේවාව. පළපුරුදු කාර්මික ශිල්පීන් විසින් නවීන උපකරණ යොදා ගනිමින් කාර්යක්ෂමව සහ ආරක්ෂිතව සේවාව සපයනු ලැබේ. පාරිභෝගික තෘප්තිය 100% ක් තහවුරු කරනු ලබන අතර, සාධාරණ මිල ගණන් සහ කඩිනම් සේවාව අපගේ ප්‍රමුඛතාවයි.`,
        category: category || "home service",
        categoryGroup: categoryGroup || "other",
        basePrice: 2500,
        priceUnit: "job",
        tags: ["විශ්වාසනීය සේවාව", "පළපුරුදු ශිල්පීන්", "කඩිනම් සේවය", "සාධාරණ මිල", "තත්ත්ව සහතිකය"],
      };
    } else if (language === "ta") {
      return {
        name: svcName,
        description: `நம்பகமான மற்றும் உயர்தர ${svcName} சேவை. அனுபவம் வாய்ந்த நிபுணர்களால் நவீன உபகரணங்களைப் பயன்படுத்தி விரைவாகவும் பாதுகாப்பாகவும் சேவை வழங்கப்படுகிறது. முழுமையான வாடிக்கையாளர் திருப்தி உத்தரவாதம் அளிக்கப்படுகிறது. நியாயமான கட்டணம் மற்றும் சிறந்த சேவை.`,
        category: category || "home service",
        categoryGroup: categoryGroup || "other",
        basePrice: 2500,
        priceUnit: "job",
        tags: ["நம்பகமான சேவை", "அனுபவம் வாய்ந்தவர்கள்", "விரைவான சேவை", "நியாயமான விலை", "தரமான வேலை"],
      };
    }

    return {
      name: svcName,
      description: `Comprehensive and reliable ${svcName} tailored to deliver exceptional quality and peace of mind. We use professional-grade equipment and industry-approved standards to ensure lasting results. Fully dedicated to customer satisfaction with prompt and courteous support.`,
      category: category || "home service",
      categoryGroup: categoryGroup || "other",
      basePrice: 2500,
      priceUnit: "job",
      tags: ["Quality Guaranteed", "Experienced Staff", "Fast Service", "Verified Pro", "Satisfaction Guaranteed"],
    };
  }
};