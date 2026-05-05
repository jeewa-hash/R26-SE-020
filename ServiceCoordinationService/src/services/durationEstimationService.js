const durationRanges = {
  "Repairing Services": { Low: 2, Medium: 4, High: 8 },
  "Cleaning Services": { Low: 3, Medium: 5, High: 8 },
  "Gardening Services": { Low: 2, Medium: 5, High: 9 },
  "Care and Personal Support Services": { Low: 3, Medium: 6, High: 10 }
};

export const estimateDuration = ({ serviceCategory, taskComplexity = "Medium" }) => {
  const categoryDurations = durationRanges[serviceCategory];
  if (!categoryDurations) return { estimatedDurationHours: 4, confidence: "Low", note: "Unknown category. Default duration used." };
  return { estimatedDurationHours: categoryDurations[taskComplexity] || categoryDurations.Medium, confidence: taskComplexity === "High" ? "Medium" : "High", note: "Rule-based duration estimation used as fallback." };
};
