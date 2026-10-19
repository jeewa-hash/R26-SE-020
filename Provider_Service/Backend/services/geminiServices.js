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

// Supported standardized categories for matching
const ALLOWED_CATEGORIES = [
  "plumbing",
  "electrical",
  "carpentry",
  "cleaning",
  "planting",
  "painting",
  "roofing",
  "repairing",
  "home service",
  "other",
];

// Singlish & trade slang dictionary for intelligent fallback category detection
const SINGLISH_CATEGORY_RULES = [
  {
    regex: /\b(wathura|pipe|paip|sink|bime|karala|leak|taps?|washroom|toilet|drain|nawathth)\b/i,
    category: "plumbing",
    group: "plumbing",
    enName: "Professional Plumbing & Leak Repair",
    siName: "වෘත්තීය ජල නල එලීම් සහ කාන්දු අලුත්වැඩියාව",
    taName: "தொழில்முறை பிளம்பிங் மற்றும் கசிவு பழுதுபார்த்தல்",
  },
  {
    regex: /\b(current|wiring|light|fan|bulb|socket|breaker|trip|switch|motor|power)\b/i,
    category: "electrical",
    group: "electrical",
    enName: "Electrical Installation & Repair",
    siName: "විදුලි රැහැන් එලීම් සහ උපකරණ අලුත්වැඩියාව",
    taName: "மின்சார வயரிங் மற்றும் பழுதுபார்த்தல் சேவை",
  },
  {
    regex: /\b(paint|peint|colour|paatha|brush|thahadu|putty|coating)\b/i,
    category: "painting",
    group: "painting",
    enName: "Interior & Exterior House Painting",
    siName: "ගෘහස්ථ හා බාහිර උසස් තත්ත්වයේ තීන්ත ආලේපනය",
    taName: "உள்துறை மற்றும் வெளிப்புற வர்ணம் பூசுதல் சேவை",
  },
  {
    regex: /\b(gas|tree|kapanna|kapanawa|mal|waththa|garden|lawn|pol|grass|shrub)\b/i,
    category: "planting",
    group: "planting",
    enName: "Landscaping & Tree Maintenance",
    siName: "වතු අලංකරණය සහ ගස් කප්පාදු කිරීමේ සේවාව",
    taName: "தோட்ட பராமரிப்பு மற்றும் மரம் வெட்டும் சேவை",
  },
  {
    regex: /\b(wahala|roof|sealing|waterproof|tiles?|asbestos|gutter)\b/i,
    category: "roofing",
    group: "roofing",
    enName: "Roof Construction & Leak Proofing",
    siName: "වහල සෙවිලි කිරීම සහ කාන්දු වැළැක්වීමේ සේවාව",
    taName: "கூரை சீரமைப்பு மற்றும் கசிவு தடுப்பு சேவை",
  },
  {
    regex: /\b(wood|lali|dora|janela|table|putu|almariah|door|window|furniture|baas)\b/i,
    category: "carpentry",
    group: "carpentry",
    enName: "Custom Carpentry & Woodwork",
    siName: "පළපුරුදු වඩු කාර්මික සහ ලී භාණ්ඩ සේවාව",
    taName: "தச்சு மற்றும் மர வேலைப்பாடுகள் சேவை",
  },
  {
    regex: /\b(clean|hodanna|sodanawa|wash|dust|mop|soodanawa|deep clean)\b/i,
    category: "cleaning",
    group: "cleaning",
    enName: "Deep Cleaning & Sanitization Services",
    siName: "පරිපූර්ණ නිවාස සහ කාර්යාල පිරිසිදු කිරීමේ සේවාව",
    taName: "முழுமையான துப்புரவு மற்றும் தூய்மைப்படுத்தும் சேவை",
  },
  {
    regex: /\b(thappaya|mason|badinna|bandinna|concrete|cement|plaster|biththi|brick)\b/i,
    category: "repairing",
    group: "repairing",
    enName: "Masonry, Tiling & Building Repairs",
    siName: "මේසන් කාර්මික සහ ගොඩනැගිලි අලුත්වැඩියා සේවාව",
    taName: "கொத்தனார் மற்றும் கட்டுமான பழுதுபார்த்தல் சேவை",
  },
  {
    regex: /\b(ac|air condition|fridge|refrigerator|gas gahanna|appliance|cooler)\b/i,
    category: "repairing",
    group: "repairing",
    enName: "Air Conditioning & Appliance Repair",
    siName: "වායුසමීකරණ සහ ගෘහ විදුලි උපකරණ අලුත්වැඩියාව",
    taName: "ஏர் கண்டிஷனர் மற்றும் வீட்டு உபகரண பழுதுபார்த்தல்",
  },
];

export const generateServiceDetailsWithGemini = async ({ name, category, categoryGroup, language = "en" }) => {
  const langPromptInstruction = {
    si: `LANGUAGE INSTRUCTION: Write the "description", "name", and "tags" entirely in natural, fluent, and professional Sinhala (සිංහල බසින්). Ensure standard Sinhala spelling and clear sentence structure suitable for clients in Sri Lanka.`,
    ta: `LANGUAGE INSTRUCTION: Write the "description", "name", and "tags" entirely in natural, fluent, and professional Tamil (தமிழ் மொழியில்). Ensure standard Tamil spelling and polite tone suitable for clients in Sri Lanka.`,
    en: `LANGUAGE INSTRUCTION: Write the "description", "name", and "tags" in fluent, professional English.`,
  }[language] || `LANGUAGE INSTRUCTION: Write in fluent, professional English.`;

  const prompt = `You are a professional service business consultant and AI classifier for trade and home services in Sri Lanka.
A service provider has entered a service title which may be in informal English, Sri Lankan Singlish (phonetic Sinhala written in Latin letters, e.g. "wathura pipe hadanna", "current wada", "thappaya badinna", "gewal paint karana eka", "gas kapanna", "pol kadanna", "ac hadanna", "baas wada"), spoken Sinhala, Tamil, or colloquial trade slang.

YOUR TASK:
1. UNDERSTAND THE INTENT: Analyze the input "${name || category || 'Home Service'}" and identify the real trade/service domain.
2. AUTO-DETECT THE CATEGORY: Classify it into exactly ONE of the following valid categories:
   ["plumbing", "electrical", "carpentry", "cleaning", "planting", "painting", "roofing", "repairing", "home service", "other"].
   (Examples:
    - "wathura pipe leak", "wathura pipe hadanna", "sink tap repair" -> "plumbing"
    - "current wada", "wiring adinna", "light fixing" -> "electrical"
    - "gewal paint karana eka", "paint adinna" -> "painting"
    - "gas kapanna", "waththa sudda karanna", "pol kadanna" -> "planting"
    - "wahala hadanna", "roof leak proofing" -> "roofing"
    - "dora janela hadanna", "wood work" -> "carpentry"
    - "ge sudda karanna", "deep clean" -> "cleaning"
    - "thappaya badinna", "mason wada", "ac repair", "gas gahanna" -> "repairing")
3. TRANSFORM TO PROFESSIONAL NAME: Upgrade the informal, Singlish, or slang input into a refined, high-end professional Service Name in the requested language (e.g., if input is "wathura pipe hadanna", in English return "Professional Plumbing & Leak Repair", in Sinhala return "වෘත්තීය නල එලීම් සහ කාන්දු අලුත්වැඩියාව").
4. GENERATE DETAILED SERVICE SPECS: Write a persuasive 2-paragraph description, realistic pricing in LKR, and 4-6 relevant tags.

${langPromptInstruction}

Respond in STRICT JSON with no markdown formatting or code blocks:
{
  "name": "Refined professional service name (in requested language)",
  "description": "Write a compelling 2-3 paragraph professional service description in the requested language. Highlight the scope of work, what is included, high standards of quality and safety, professional tools used, reliability, and full customer satisfaction guarantee.",
  "category": "auto-detected category from the exact list above",
  "categoryGroup": "matching category or group",
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

    const detectedCategory = ALLOWED_CATEGORIES.includes(parsed.category)
      ? parsed.category
      : (ALLOWED_CATEGORIES.includes(parsed.categoryGroup) ? parsed.categoryGroup : (category || "home service"));

    return {
      name: parsed.name || name || "Professional Service",
      description: parsed.description || "",
      category: detectedCategory,
      categoryGroup: detectedCategory,
      basePrice: Number(parsed.suggestedBasePrice || parsed.basePrice) || 2500,
      priceUnit: ["hour", "day", "job", "sqft", "item"].includes(parsed.priceUnit) ? parsed.priceUnit : "job",
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  } catch (err) {
    console.warn("⚠️ Gemini service generation failed, using intelligent Singlish fallback:", err.message);
    const entered = (name || "").toLowerCase();

    // Check Singlish keyword dictionary rules
    const matchedRule = SINGLISH_CATEGORY_RULES.find((rule) => rule.regex.test(entered));
    const fallbackCategory = matchedRule ? matchedRule.category : (category || "home service");
    const fallbackGroup = matchedRule ? matchedRule.group : (categoryGroup || "other");

    let svcName = name || category || "Professional Home Service";
    if (matchedRule) {
      if (language === "si") svcName = matchedRule.siName;
      else if (language === "ta") svcName = matchedRule.taName;
      else svcName = matchedRule.enName;
    }

    if (language === "si") {
      return {
        name: svcName,
        description: `විශ්වාසනීය හා උසස් තත්ත්වයේ ${svcName} සේවාව. පළපුරුදු කාර්මික ශිල්පීන් විසින් නවීන උපකරණ යොදා ගනිමින් කාර්යක්ෂමව සහ ආරක්ෂිතව සේවාව සපයනු ලැබේ. පාරිභෝගික තෘප්තිය 100% ක් තහවුරු කරනු ලබන අතර, සාධාරණ මිල ගණන් සහ කඩිනම් සේවාව අපගේ ප්‍රමුඛතාවයි.`,
        category: fallbackCategory,
        categoryGroup: fallbackGroup,
        basePrice: 2500,
        priceUnit: "job",
        tags: ["විශ්වාසනීය සේවාව", "පළපුරුදු ශිල්පීන්", "කඩිනම් සේවය", "සාධාරණ මිල", "තත්ත්ව සහතිකය"],
      };
    } else if (language === "ta") {
      return {
        name: svcName,
        description: `நம்பகமான மற்றும் உயர்தர ${svcName} சேவை. அனுபவம் வாய்ந்த நிபுணர்களால் நவீன உபகரணங்களைப் பயன்படுத்தி விரைவாகவும் பாதுகாப்பாகவும் சேவை வழங்கப்படுகிறது. முழுமையான வாடிக்கையாளர் திருப்தி உத்தரவாதம் அளிக்கப்படுகிறது. நியாயமான கட்டணம் மற்றும் சிறந்த சேவை.`,
        category: fallbackCategory,
        categoryGroup: fallbackGroup,
        basePrice: 2500,
        priceUnit: "job",
        tags: ["நம்பகமான சேவை", "அனுபவம் வாய்ந்தவர்கள்", "விரைவான சேவை", "நியாயமான விலை", "தரமான வேலை"],
      };
    }

    return {
      name: svcName,
      description: `Comprehensive and reliable ${svcName} tailored to deliver exceptional quality and peace of mind. We use professional-grade equipment and industry-approved standards to ensure lasting results. Fully dedicated to customer satisfaction with prompt and courteous support.`,
      category: fallbackCategory,
      categoryGroup: fallbackGroup,
      basePrice: 2500,
      priceUnit: "job",
      tags: ["Quality Guaranteed", "Experienced Staff", "Fast Service", "Verified Pro", "Satisfaction Guaranteed"],
    };
  }
};