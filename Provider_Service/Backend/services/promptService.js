/**
 * services/promptService.js
 * Builds the Gemini prompt for AI-assisted service post generation.
 * Produces one structured post per requested platform, in the provider's
 * chosen language (English / Sinhala / Tamil — NFR-02).
 */

const LANGUAGE_NAMES = {
  en: "English",
  si: "Sinhala",
  ta: "Tamil",
};

const PLATFORM_RULES = `
- facebook: warm and welcoming, 60-120 words, light emoji use is fine, end with a clear call to action.
- instagram: short caption, under 60 words, emoji-friendly, include 5-8 relevant hashtags.
- whatsapp: short and personal, direct-message style, under 50 words, no hashtags.
- sms: plain text only, under 160 characters total, no emojis, no hashtags, must include the contact number.
`;

export const buildPrompt = (adData) => {
  const languageName = LANGUAGE_NAMES[adData.language] || "English";
  const platformList = adData.platforms.join(", ");
  const tagsLine = adData.tags?.length ? adData.tags.join(", ") : "none";

  return `
You are a professional advertisement copywriter for a local home-services marketplace in Sri Lanka.
Your client is an independent service provider (a micro-entrepreneur) who has limited time and marketing experience.

Write a separate promotional post for each of the following platforms: ${platformList}.
Write entirely in ${languageName}, except keep the provider name, location, and contact number exactly as given below, in their original characters/digits, even if the rest of the text is in Sinhala or Tamil.

PROVIDER & SERVICE DETAILS:
- Provider name: ${adData.providerName}
- Service: ${adData.serviceLabel}${adData.specificLabel ? ` (${adData.specificLabel})` : ""}
- Category: ${adData.category}
- Location: ${adData.location}
- Contact: ${adData.contact}
- Requested tone: ${adData.tone}
- Related tags/keywords: ${tagsLine}
- Extra info from the provider: ${adData.extraInfo || "none"}

PLATFORM-SPECIFIC RULES:
${PLATFORM_RULES}

Only generate posts for these platforms, in this exact set: ${platformList}.

Respond with ONLY valid JSON — no markdown code fences, no explanation, no extra text before or after.
Match this exact shape:

{
  "posts": [
    { "platform": "facebook", "title": "string", "caption": "string", "hashtags": ["string"] }
  ]
}

For "sms" and "whatsapp", "hashtags" must be an empty array and "title" may be an empty string.
`;
};
