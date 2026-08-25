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