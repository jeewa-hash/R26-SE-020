export const decideBidCoordination = ({ priceEvaluation, scheduleEvaluation }) => {
  let finalDecision = "CAN_ACCEPT";
  let recommendedAction =
    "This bid can be shown to the seeker for review and acceptance.";

  if (scheduleEvaluation.conflictDetected) {
    return {
      finalDecision: "RESCHEDULE_REQUIRED",
      recommendedAction:
        scheduleEvaluation.conflictReason ||
        "Provider proposed time has a schedule conflict. Suggest a new time slot.",
    };
  }

  if (scheduleEvaluation.delayRiskLevel === "High") {
    finalDecision = "AVAILABLE_WITH_CAUTION";
    recommendedAction =
      "ML risk analysis indicates a high delay risk. Seeker should review before accepting.";
  }

  if (scheduleEvaluation.delayRiskLevel === "Medium") {
    finalDecision = "AVAILABLE_WITH_CAUTION";
    recommendedAction =
      "ML risk analysis indicates a medium delay risk. Seeker can proceed with caution.";
  }

  if (scheduleEvaluation.preferredTimeMatch === "OUTSIDE_PREFERENCE") {
    finalDecision = "AVAILABLE_WITH_CAUTION";
    recommendedAction =
      "Provider proposed time is outside the seeker preferred time window. Seeker can accept or request another time.";
  }

  if (priceEvaluation.priceStatus === "TOO_HIGH") {
    finalDecision = "AVAILABLE_WITH_CAUTION";
    recommendedAction =
      "Quotation is much higher than the expected range. Seeker should review or counter-offer.";
  }

  if (priceEvaluation.priceStatus === "TOO_LOW") {
    finalDecision = "AVAILABLE_WITH_CAUTION";
    recommendedAction =
      "Quotation is much lower than expected. Confirm scope and quality before accepting.";
  }

  if (priceEvaluation.budgetStatus === "ABOVE_BUDGET") {
    finalDecision = "AVAILABLE_WITH_CAUTION";
    recommendedAction =
      "Quotation is above the seeker budget. Seeker can accept or send a counter-offer.";
  }

  return {
    finalDecision,
    recommendedAction,
  };
};