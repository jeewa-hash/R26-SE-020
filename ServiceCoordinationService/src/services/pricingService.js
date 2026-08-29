export const evaluateBidPrice = ({
    detectedCategory,
    urgencyLevel,
    providerQuotedPrice,
    seekerBudgetAmount,
    providerEstimatedDurationHours,
  }) => {
    const price = Number(providerQuotedPrice);
    const budget =
      seekerBudgetAmount === null || seekerBudgetAmount === undefined
        ? null
        : Number(seekerBudgetAmount);
  
    const durationHours = Number(providerEstimatedDurationHours || 1);
  
    const basePrices = {
      plumbing: 3500,
      electrical: 3500,
      cleaning: 3000,
      gardening: 3000,
      carpentry: 4500,
    }; // Chaw: simple category-based starting price for first version
  
    const normalizedCategory = String(detectedCategory || "").toLowerCase();
  
    const basePrice = basePrices[normalizedCategory] || 3500; // Chaw: fallback base price when category is unknown
  
    const urgencyText = String(urgencyLevel || "").toLowerCase();
  
    let urgencyFee = 0;
  
    if (
      urgencyText.includes("critical") ||
      urgencyText.includes("emergency") ||
      urgencyText.includes("within 24")
    ) {
      urgencyFee = 1000; // Chaw: urgent work usually costs more
    } else if (urgencyText.includes("today") || urgencyText.includes("medium")) {
      urgencyFee = 500; // Chaw: same-day work has smaller urgency fee
    }
  
    const durationFee = Math.max(0, durationHours - 1) * 500; // Chaw: add simple cost for longer jobs
  
    const suggestedPrice = Math.round(basePrice + urgencyFee + durationFee);
  
    const minFairPrice = Math.round(suggestedPrice * 0.85);
    const maxFairPrice = Math.round(suggestedPrice * 1.15);
  
    let priceStatus = "FAIR";
  
    if (price < minFairPrice * 0.85) {
      priceStatus = "TOO_LOW";
    } else if (price < minFairPrice) {
      priceStatus = "BELOW_MARKET";
    } else if (price <= maxFairPrice) {
      priceStatus = "FAIR";
    } else if (price <= maxFairPrice * 1.2) {
      priceStatus = "ABOVE_MARKET";
    } else {
      priceStatus = "TOO_HIGH";
    }
  
    let budgetStatus = "NO_BUDGET_PROVIDED";
  
    if (budget !== null && !Number.isNaN(budget)) {
      budgetStatus = price <= budget ? "WITHIN_BUDGET" : "ABOVE_BUDGET";
    }
  
    let message = "Quotation price is within the expected range.";
  
    if (priceStatus === "TOO_LOW") {
      message =
        "Quotation is much lower than the expected range. It may need quality or scope verification.";
    } else if (priceStatus === "BELOW_MARKET") {
      message =
        "Quotation is below the expected range. This may be a good deal, but scope should be clear.";
    } else if (priceStatus === "ABOVE_MARKET") {
      message =
        "Quotation is slightly above the expected range. Seeker may counter-offer.";
    } else if (priceStatus === "TOO_HIGH") {
      message =
        "Quotation is much higher than the expected range. Seeker should review before accepting.";
    }
  
    return {
      providerQuotedPrice: price,
      seekerBudgetAmount: budget,
      suggestedPrice,
      minFairPrice,
      maxFairPrice,
      priceStatus,
      budgetStatus,
      message,
    };
  };