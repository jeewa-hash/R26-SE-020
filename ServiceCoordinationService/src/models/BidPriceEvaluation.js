import mongoose from "mongoose";

const bidPriceEvaluationSchema = new mongoose.Schema(
  {
    bidCoordinationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    }, // Chaw: links price evaluation to BidCoordination

    providerQuotedPrice: {
      type: Number,
      required: true,
      min: 0,
    }, // Chaw: price submitted by provider

    seekerBudgetAmount: {
      type: Number,
      default: null,
      min: 0,
    }, // Chaw: optional budget submitted by seeker

    suggestedPrice: {
      type: Number,
      default: null,
    }, // Chaw: rule-based recommended price

    minFairPrice: {
      type: Number,
      default: null,
    }, // Chaw: lower bound of fair price range

    maxFairPrice: {
      type: Number,
      default: null,
    }, // Chaw: upper bound of fair price range

    priceStatus: {
      type: String,
      enum: [
        "TOO_LOW",
        "BELOW_MARKET",
        "FAIR",
        "ABOVE_MARKET",
        "TOO_HIGH",
        "NOT_CHECKED",
      ],
      default: "NOT_CHECKED",
    }, // Chaw: price fairness label

    budgetStatus: {
      type: String,
      enum: [
        "WITHIN_BUDGET",
        "ABOVE_BUDGET",
        "NO_BUDGET_PROVIDED",
        "NOT_CHECKED",
      ],
      default: "NOT_CHECKED",
    }, // Chaw: compares provider quote with seeker budget

    message: {
      type: String,
      default: "",
      trim: true,
    }, // Chaw: readable pricing explanation
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("BidPriceEvaluation", bidPriceEvaluationSchema);