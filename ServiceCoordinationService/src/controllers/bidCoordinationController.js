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
import BidSuggestedSlot from "../models/BidSuggestedSlot.js";
import { generateSuggestedSlots } from "../services/suggestedSlotService.js";

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

    const scheduleEvaluationData = await evaluateBidSchedule({
    providerId: providerQuotation.providerId, // Chaw: needed to validate provider availability and existing bookings
    proposedStartTime: providerQuotation.proposedStartTime,
    preferredStartTime: requestQuotation.preferredStartTime,
    preferredEndTime: requestQuotation.preferredEndTime,
    providerEstimatedDurationHours:
        providerQuotation.estimatedDurationHours,
    seekerEstimatedDurationHours:
        requestQuotation.seekerEstimatedDurationHours,
    mlPredictedDurationHours: null,
    bufferMinutes,
    }); // Chaw: schedule evaluation now checks ProviderAvailability and Booking conflicts

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

    let suggestedSlots = [];

    await BidSuggestedSlot.deleteMany({
    bidCoordinationId: coordination._id,
    }); // Chaw: clear old suggestions before regenerating

    if (decisionData.finalDecision === "RESCHEDULE_REQUIRED") {
    const generatedSlots = await generateSuggestedSlots({
        providerId: providerQuotation.providerId,
        originalStartTime: scheduleEvaluationData.requiredWindowStart,
        finalSchedulingDurationHours:
        scheduleEvaluationData.finalSchedulingDurationHours,
        bufferMinutes: scheduleEvaluationData.bufferMinutes,
        maxSuggestions: 3,
    }); // Chaw: generate alternative available time slots

    if (generatedSlots.length > 0) {
        suggestedSlots = await BidSuggestedSlot.insertMany(
        generatedSlots.map((slot) => ({
            bidCoordinationId: coordination._id,
            ...slot,
        }))
        ); // Chaw: save suggested slots for seeker review
    }
    }

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
        suggestedSlots,
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


//select suggested slot 

export const selectSuggestedSlot = async (req, res) => {
    try {
      const { coordinationId, slotId } = req.params;
  
      if (
        !mongoose.Types.ObjectId.isValid(coordinationId) ||
        !mongoose.Types.ObjectId.isValid(slotId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid coordination ID or suggested slot ID.",
        });
      }
  
      const coordination = await BidCoordination.findById(coordinationId);
  
      if (!coordination) {
        return res.status(404).json({
          success: false,
          message: "Bid coordination not found.",
        });
      }
  
      const selectedSlot = await BidSuggestedSlot.findOne({
        _id: slotId,
        bidCoordinationId: coordinationId,
        status: "AVAILABLE",
      });
  
      if (!selectedSlot) {
        return res.status(404).json({
          success: false,
          message: "Available suggested slot not found.",
        });
      }
  
      const priceEvaluation = await BidPriceEvaluation.findOne({
        bidCoordinationId: coordination._id,
      });
  
      if (!priceEvaluation) {
        return res.status(404).json({
          success: false,
          message: "Price evaluation not found for this coordination.",
        });
      }
  
      const scheduleEvaluation = await BidScheduleEvaluation.findOne({
        bidCoordinationId: coordination._id,
      });
  
      if (!scheduleEvaluation) {
        return res.status(404).json({
          success: false,
          message: "Schedule evaluation not found for this coordination.",
        });
      }
  
      const selectedDurationHours =
        scheduleEvaluation.finalSchedulingDurationHours;
  
      const updatedScheduleData = {
        proposedStartTime: selectedSlot.startTime,
        requiredWindowStart: selectedSlot.startTime,
        requiredWindowEnd: selectedSlot.endTime,
        finalSchedulingDurationHours: selectedDurationHours,
        conflictDetected: false,
        conflictReason: "",
      }; // Chaw: selected suggested slot becomes the new valid schedule window
  
      const updatedScheduleEvaluation =
        await BidScheduleEvaluation.findOneAndUpdate(
          {
            bidCoordinationId: coordination._id,
          },
          updatedScheduleData,
          {
            new: true,
            runValidators: true,
          }
        );
  
      const decisionData = decideBidCoordination({
        priceEvaluation,
        scheduleEvaluation: updatedScheduleEvaluation,
      }); // Chaw: recalculate decision after seeker selects available slot
  
      const updatedCoordination = await BidCoordination.findByIdAndUpdate(
        coordination._id,
        {
          finalDecision: decisionData.finalDecision,
          recommendedAction: decisionData.recommendedAction,
          status: "ready_for_seeker_review",
        },
        {
          new: true,
          runValidators: true,
        }
      );
  
      await BidSuggestedSlot.updateMany(
        {
          bidCoordinationId: coordination._id,
          _id: { $ne: selectedSlot._id },
        },
        {
          status: "EXPIRED",
        }
      ); // Chaw: expire other suggestions once seeker selects one
  
      const updatedSelectedSlot = await BidSuggestedSlot.findByIdAndUpdate(
        selectedSlot._id,
        {
          status: "SELECTED",
          selectedAt: new Date(),
        },
        {
          new: true,
          runValidators: true,
        }
      ); // Chaw: mark chosen slot as selected
  
      let providerQuotationUpdate = null;
      let providerQuotationUpdateWarning = null;
  
      try {
        providerQuotationUpdate = await updateProviderQuotationCoordination(
        coordination.externalQuotationId,
        decisionData.finalDecision,
        coordination._id.toString(),
        updatedScheduleEvaluation.requiredWindowStart,
        updatedScheduleEvaluation.requiredWindowEnd
        ); // Chaw: update Provider Quotation with final coordinated selected slot
      } catch (updateError) {
        providerQuotationUpdateWarning = updateError.message;
      }
  
      return res.status(200).json({
        success: true,
        message: "Suggested slot selected successfully.",
        data: {
          coordination: updatedCoordination,
          priceEvaluation,
          scheduleEvaluation: updatedScheduleEvaluation,
          selectedSlot: updatedSelectedSlot,
          providerQuotationUpdate,
          providerQuotationUpdateWarning,
        },
      });
    } catch (error) {
      console.error("SELECT SUGGESTED SLOT ERROR:", error);
  
      return res.status(500).json({
        success: false,
        message: "Failed to select suggested slot.",
        error: error.message,
      });
    }
  };