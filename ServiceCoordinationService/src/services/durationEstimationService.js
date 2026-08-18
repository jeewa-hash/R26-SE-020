import serviceDurationReference from "../data/serviceDurationReference.js";

function normalizeText(value = "") {
  return value.toString().trim().toLowerCase();
}

function calculateMatchScore(record, input) {
  let score = 0;

  const category = normalizeText(input.serviceCategory);
  const subcategory = normalizeText(input.serviceSubcategory);
  const taskName = normalizeText(input.taskName);
  const complexity = normalizeText(input.complexityLevel);
  const propertySize = normalizeText(input.propertySize);

  const recordCategory = normalizeText(record.serviceCategory);
  const recordSubcategory = normalizeText(record.serviceSubcategory);
  const recordTask = normalizeText(record.taskName);
  const recordComplexity = normalizeText(record.complexityLevel);
  const recordPropertySize = normalizeText(record.propertySize);

  if (category && recordCategory.includes(category)) score += 30;
  if (subcategory && recordSubcategory.includes(subcategory)) score += 25;
  if (taskName && recordTask.includes(taskName)) score += 25;
  if (complexity && recordComplexity === complexity) score += 10;
  if (propertySize && recordPropertySize === propertySize) score += 10;

  if (category.includes("plumbing") && recordSubcategory.includes("plumbing")) {
    score += 40;
  }

  if (
    category.includes("garden") ||
    category.includes("landscaping") ||
    category.includes("gardening")
  ) {
    if (
      recordCategory.includes("gardening") ||
      recordSubcategory.includes("landscaping")
    ) {
      score += 40;
    }
  }

  if (category.includes("cleaning") && recordCategory.includes("cleaning")) {
    score += 40;
  }

  if (category.includes("care") && recordCategory.includes("care")) {
    score += 40;
  }

  return score;
}

export function estimateServiceDuration(input) {
  const rankedMatches = serviceDurationReference
    .map((record) => ({
      ...record,
      matchScore: calculateMatchScore(record, input),
    }))
    .sort((a, b) => b.matchScore - a.matchScore);

  const bestMatch = rankedMatches[0];

  if (!bestMatch || bestMatch.matchScore === 0) {
    return {
      estimatedMinHours: 1,
      estimatedMaxHours: 3,
      averageDurationHours: 2,
      requiresMultipleDays: false,
      confidence: "LOW",
      matchedTask: null,
      message: "No strong duration match found. Default duration applied.",
    };
  }

  let adjustedAverageDuration = bestMatch.averageDurationHours;

  if (normalizeText(input.urgency) === "high") {
    adjustedAverageDuration += 0.5;
  }

  return {
    estimatedMinHours: bestMatch.estimatedMinHours,
    estimatedMaxHours: bestMatch.estimatedMaxHours,
    averageDurationHours: Number(adjustedAverageDuration.toFixed(2)),
    requiresMultipleDays: bestMatch.requiresMultipleDays,
    confidence:
      bestMatch.matchScore >= 70
        ? "HIGH"
        : bestMatch.matchScore >= 40
        ? "MEDIUM"
        : "LOW",
    matchedTask: {
      serviceCategory: bestMatch.serviceCategory,
      serviceSubcategory: bestMatch.serviceSubcategory,
      taskName: bestMatch.taskName,
      complexityLevel: bestMatch.complexityLevel,
      propertySize: bestMatch.propertySize,
      matchScore: bestMatch.matchScore,
    },
    message: "Duration estimated successfully.",
  };
}