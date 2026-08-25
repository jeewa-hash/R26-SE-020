import mongoose from "mongoose";

import BidCoordination from "../models/BidCoordination.js";
import BidPriceEvaluation from "../models/BidPriceEvaluation.js";
import BidScheduleEvaluation from "../models/BidScheduleEvaluation.js";

import { getRequestQuotationById } from "../clients/seekerServiceClient.js";
import {
  getProviderQuotationById,
  updateProviderQuotationCoordination,
} from "../clients/providerServiceClient.js";

import { evaluateBidPrice } from "../services/pricingService.js";
import { evaluateBidSchedule } from "../services/scheduleEvaluationService.js";
import { decideBidCoordination } from "../services/bidDecisionService.js";

export const checkBidCoordination = async (req, res) => {
  try {
    const {
      externalRequestQuotationId,
      externalQuotationId,
      bufferMinutes = 30,
    } = req.body;

    if (!externalRequestQuotationId || !externalQuotationId) {
      return res.status(400).json({
        success: false,
        message:
          "externalRequestQuotationId and externalQuotationId are required.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(externalRequestQuotationId) ||
      !mongoose.Types.ObjectId.isValid(externalQuotationId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid request quotation ID or provider quotation ID.",
      });
    }

    const requestQuotation = await getRequestQuotationById(
      externalRequestQuotationId
    ); // Chaw: fetch seeker request context from Seeker Service

    const providerQuotation = await getProviderQuotationById(
      externalQuotationId
    ); // Chaw: fetch provider bid details from Provider Service

    if (
      String(requestQuotation._id) !== String(providerQuotation.providerRequestId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Provider quotation does not belong to the given request quotation.",
      });
    }

    if (
      String(requestQuotation.sessionId) !==
      String(providerQuotation.externalSessionId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Provider quotation session does not match request quotation session.",
      });
    }

    if (
      String(requestQuotation.seekerId) !== String(providerQuotation.seekerId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Seeker mismatch between request quotation and provider bid.",
      });
    }

    if (
      String(requestQuotation.providerId) !== String(providerQuotation.providerId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Provider mismatch between request quotation and provider bid.",
      });
    }

    const priceEvaluationData = evaluateBidPrice({
      detectedCategory: requestQuotation.detectedCategory,
      urgencyLevel: requestQuotation.urgencyLevel,
      providerQuotedPrice: providerQuotation.price,
      seekerBudgetAmount: requestQuotation.seekerBudgetAmount,
      providerEstimatedDurationHours: providerQuotation.estimatedDurationHours,
    }); // Chaw: rule-based price and budget evaluation

    const scheduleEvaluationData = evaluateBidSchedule({
      proposedStartTime: providerQuotation.proposedStartTime,
      preferredStartTime: requestQuotation.preferredStartTime,
      preferredEndTime: requestQuotation.preferredEndTime,
      providerEstimatedDurationHours:
        providerQuotation.estimatedDurationHours,
      seekerEstimatedDurationHours:
        requestQuotation.seekerEstimatedDurationHours,
      mlPredictedDurationHours: null,
      bufferMinutes,
    }); // Chaw: first schedule evaluation without booking conflict check

    const decisionData = decideBidCoordination({
      priceEvaluation: priceEvaluationData,
      scheduleEvaluation: scheduleEvaluationData,
    }); // Chaw: combine price + schedule evaluation into final decision

    const coordination = await BidCoordination.findOneAndUpdate(
      {
        externalQuotationId,
      },
      {
        externalSessionId: requestQuotation.sessionId,
        externalRequestQuotationId,
        externalQuotationId,
        seekerId: requestQuotation.seekerId,
        providerId: requestQuotation.providerId,
        finalDecision: decisionData.finalDecision,
        recommendedAction: decisionData.recommendedAction,
        status: "ready_for_seeker_review",
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ); // Chaw: create or update one coordination record per provider quotation

    const priceEvaluation = await BidPriceEvaluation.findOneAndUpdate(
      {
        bidCoordinationId: coordination._id,
      },
      {
        bidCoordinationId: coordination._id,
        ...priceEvaluationData,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ); // Chaw: save price evaluation separately

    const scheduleEvaluation = await BidScheduleEvaluation.findOneAndUpdate(
      {
        bidCoordinationId: coordination._id,
      },
      {
        bidCoordinationId: coordination._id,
        ...scheduleEvaluationData,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ); // Chaw: save schedule evaluation separately

    let providerQuotationUpdate = null;
    let providerQuotationUpdateWarning = null;

    try {
      providerQuotationUpdate = await updateProviderQuotationCoordination(
        externalQuotationId,
        decisionData.finalDecision,
        coordination._id.toString()
      ); // Chaw: update Provider Service quotation with coordination result
    } catch (updateError) {
      providerQuotationUpdateWarning = updateError.message;
    }

    return res.status(200).json({
      success: true,
      message: "Bid coordination check completed successfully.",
      data: {
        coordination,
        priceEvaluation,
        scheduleEvaluation,
        providerQuotationUpdate,
        providerQuotationUpdateWarning,
      },
    });
  } catch (error) {
    console.error("CHECK BID COORDINATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to check bid coordination.",
      error: error.message,
    });
  }
};

export const getBidCoordinationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bid coordination ID.",
      });
    }

    const coordination = await BidCoordination.findById(id);

    if (!coordination) {
      return res.status(404).json({
        success: false,
        message: "Bid coordination not found.",
      });
    }

    const priceEvaluation = await BidPriceEvaluation.findOne({
      bidCoordinationId: coordination._id,
    });

    const scheduleEvaluation = await BidScheduleEvaluation.findOne({
      bidCoordinationId: coordination._id,
    });

    return res.status(200).json({
      success: true,
      data: {
        coordination,
        priceEvaluation,
        scheduleEvaluation,
      },
    });
  } catch (error) {
    console.error("GET BID COORDINATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch bid coordination.",
      error: error.message,
    });
  }
};

export const getBidCoordinationsBySession = async (req, res) => {
  try {
    const { externalSessionId } = req.params;

    const coordinations = await BidCoordination.find({
      externalSessionId,
    }).sort({ createdAt: -1 });

    const result = await Promise.all(
      coordinations.map(async (coordination) => {
        const priceEvaluation = await BidPriceEvaluation.findOne({
          bidCoordinationId: coordination._id,
        });

        const scheduleEvaluation = await BidScheduleEvaluation.findOne({
          bidCoordinationId: coordination._id,
        });

        return {
          coordination,
          priceEvaluation,
          scheduleEvaluation,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error("GET SESSION BID COORDINATIONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch session bid coordinations.",
      error: error.message,
    });
  }
};