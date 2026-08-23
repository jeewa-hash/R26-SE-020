/**
 * utils/adPostHelpers.js
 * Validation and data-shaping for AI-assisted post generation (FR-03).
 * Supports two input flows:
 *   1. Manual  — provider types in service details directly
 *   2. ML-based — details are built from the Portfolio Classification
 *                 model's output (FR-12/FR-13), plus provider contact info
 */

export const VALID_PLATFORMS = ["facebook", "instagram", "whatsapp", "sms"];

export const VALID_TONES = [
  "professional",
  "friendly",
  "urgent",
  "promotional",
  "trustworthy",
];

export const VALID_LANGUAGES = ["en", "si", "ta"]; // English, Sinhala, Tamil (NFR-02)

// ─── Validate Manual Generate Request ─────────────────────────────────────

export const validateGenerateRequest = (body) => {
  const errors = [];

  if (!body.providerId || typeof body.providerId !== "string")
    errors.push("providerId is required");

  if (!body.providerName || typeof body.providerName !== "string")
    errors.push("providerName is required (e.g. 'Nimal's Cleaning Service')");

  if (!body.location || typeof body.location !== "string")
    errors.push("location is required (e.g. 'Colombo, Sri Lanka')");

  if (!body.contact || typeof body.contact !== "string")
    errors.push("contact is required (e.g. '+94 77 123 4567')");

  if (!body.serviceLabel || typeof body.serviceLabel !== "string")
    errors.push("serviceLabel is required (e.g. 'House Cleaning')");

  if (body.tone && !VALID_TONES.includes(body.tone))
    errors.push(`tone must be one of: ${VALID_TONES.join(", ")}`);

  if (body.language && !VALID_LANGUAGES.includes(body.language))
    errors.push(`language must be one of: ${VALID_LANGUAGES.join(", ")}`);

  if (body.platforms) {
    if (!Array.isArray(body.platforms) || body.platforms.length === 0) {
      errors.push("platforms must be a non-empty array");
    } else {
      const invalid = body.platforms.filter((p) => !VALID_PLATFORMS.includes(p));
      if (invalid.length > 0)
        errors.push(`Invalid platforms: ${invalid.join(", ")}. Valid: ${VALID_PLATFORMS.join(", ")}`);
    }
  }

  if (body.tags && !Array.isArray(body.tags))
    errors.push("tags must be an array of strings");

  return errors;
};

// ─── Validate ML Result Request ────────────────────────────────────────────

export const validateMLRequest = (body) => {
  const errors = [];

  if (!body.mlResult || typeof body.mlResult !== "object")
    errors.push("mlResult is required — paste the output from the portfolio classification /predict endpoint");

  if (!body.providerInfo || typeof body.providerInfo !== "object") {
    errors.push("providerInfo is required");
  } else {
    if (!body.providerInfo.providerId) errors.push("providerInfo.providerId is required");
    if (!body.providerInfo.name) errors.push("providerInfo.name is required");
    if (!body.providerInfo.location) errors.push("providerInfo.location is required");
    if (!body.providerInfo.contact) errors.push("providerInfo.contact is required");
    if (body.providerInfo.language && !VALID_LANGUAGES.includes(body.providerInfo.language))
      errors.push(`providerInfo.language must be one of: ${VALID_LANGUAGES.join(", ")}`);
  }

  return errors;
};

// ─── Build Ad Data from Manual Request ────────────────────────────────────

export const buildAdData = (body) => ({
  serviceLabel: body.serviceLabel,
  specificLabel: body.specificLabel || null,
  category: body.category || "home service",
  tags: body.tags || [],
  providerName: body.providerName,
  location: body.location,
  contact: body.contact,
  tone: body.tone || "professional",
  language: body.language || "en",
  extraInfo: body.extraInfo || "",
  platforms: body.platforms || VALID_PLATFORMS,
  generateImage: body.generateImage ?? false,
});

// ─── Build Ad Data from ML Output ─────────────────────────────────────────

export const buildAdDataFromML = (mlResult, providerInfo) => {
  let serviceLabel, specificLabel, tags, category;

  if (mlResult.portfolio_summary) {
    const s = mlResult.portfolio_summary;
    serviceLabel = s.services_detected?.join(" & ") || "Home Service";
    specificLabel = s.specific_services?.join(", ") || "";
    tags = s.portfolio_tags || [];
    category = s.categories?.[0] || "";
  } else {
    serviceLabel = mlResult.label || "Home Service";
    specificLabel = mlResult.specific_label || "";
    tags = mlResult.tags || [];
    category = mlResult.category || "";
  }

  return {
    serviceLabel,
    specificLabel,
    category,
    tags,
    providerName: providerInfo.name,
    location: providerInfo.location,
    contact: providerInfo.contact,
    tone: providerInfo.tone || "professional",
    language: providerInfo.language || "en",
    extraInfo: providerInfo.extraInfo || "",
    platforms: providerInfo.platforms || VALID_PLATFORMS,
    generateImage: providerInfo.generateImage ?? false,
  };
};
