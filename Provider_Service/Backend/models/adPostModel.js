/**
 * src/models/adPost.model.js
 * Data validation and structure for ad post generation
 */

export const VALID_PLATFORMS = ["facebook", "instagram", "whatsapp", "sms"];

export const VALID_TONES = [
  "professional",
  "friendly",
  "urgent",
  "promotional",
  "trustworthy",
];

// ─── Validate Manual Generate Request ────────────────────────────────────────

export const validateGenerateRequest = (body) => {
  const errors = [];

  if (!body.providerName || typeof body.providerName !== "string")
    errors.push("providerName is required (e.g. 'Nimal\\'s Cleaning Service')");

  if (!body.location || typeof body.location !== "string")
    errors.push("location is required (e.g. 'Colombo, Sri Lanka')");

  if (!body.contact || typeof body.contact !== "string")
    errors.push("contact is required (e.g. '+94 77 123 4567')");

  if (!body.serviceLabel || typeof body.serviceLabel !== "string")
    errors.push("serviceLabel is required (e.g. 'House Cleaning')");

  if (body.tone && !VALID_TONES.includes(body.tone))
    errors.push(`tone must be one of: ${VALID_TONES.join(", ")}`);

  if (body.platforms) {
    if (!Array.isArray(body.platforms)) {
      errors.push("platforms must be an array");
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

// ─── Validate ML Result Request ───────────────────────────────────────────────

export const validateMLRequest = (body) => {
  const errors = [];

  if (!body.mlResult || typeof body.mlResult !== "object")
    errors.push("mlResult is required — paste the output from your /predict endpoint");

  if (!body.providerInfo || typeof body.providerInfo !== "object") {
    errors.push("providerInfo is required");
  } else {
    if (!body.providerInfo.name)     errors.push("providerInfo.name is required");
    if (!body.providerInfo.location) errors.push("providerInfo.location is required");
    if (!body.providerInfo.contact)  errors.push("providerInfo.contact is required");
  }

  return errors;
};

// ─── Build Ad Data from Manual Request ───────────────────────────────────────

export const buildAdData = (body) => ({
  serviceLabel:  body.serviceLabel,
  specificLabel: body.specificLabel  || null,
  category:      body.category       || "home service",
  tags:          body.tags           || [],
  providerName:  body.providerName,
  location:      body.location,
  contact:       body.contact,
  tone:          body.tone           || "professional",
  extraInfo:     body.extraInfo      || "",
  platforms:     body.platforms      || VALID_PLATFORMS,
  generateImage: body.generateImage  ?? true,
});

// ─── Build Ad Data from ML Output ─────────────────────────────────────────────

export const buildAdDataFromML = (mlResult, providerInfo) => {
  let serviceLabel, specificLabel, tags, category;

  if (mlResult.portfolio_summary) {
    const s   = mlResult.portfolio_summary;
    serviceLabel  = s.services_detected?.join(" & ") || "Home Service";
    specificLabel = s.specific_services?.join(", ")  || "";
    tags          = s.portfolio_tags                 || [];
    category      = s.categories?.[0]               || "";
  } else {
    serviceLabel  = mlResult.label          || "Home Service";
    specificLabel = mlResult.specific_label || "";
    tags          = mlResult.tags           || [];
    category      = mlResult.category       || "";
  }

  return {
    serviceLabel,
    specificLabel,
    category,
    tags,
    providerName:  providerInfo.name,
    location:      providerInfo.location,
    contact:       providerInfo.contact,
    tone:          providerInfo.tone          || "professional",
    extraInfo:     providerInfo.extraInfo     || "",
    platforms:     providerInfo.platforms     || VALID_PLATFORMS,
    generateImage: providerInfo.generateImage ?? true,
  };
};

// ─── Build Final Response ─────────────────────────────────────────────────────

export const buildResponse = (adData, posts, imageResult = null) => ({
  success:         true,
  service:         adData.serviceLabel,
  specificService: adData.specificLabel || null,
  provider:        adData.providerName,
  location:        adData.location,
  tone:            adData.tone,
  generatedAt:     new Date().toISOString(),
  image:           imageResult,
  posts,
});