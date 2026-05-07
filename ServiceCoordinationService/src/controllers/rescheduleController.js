import {
    generateRescheduleSlots,
    respondToRescheduleSuggestion,
    getRescheduleSuggestionsByBooking
  } from "../services/reschedulingService.js";
  import { asyncHandler } from "../utils/asyncHandler.js";
  import { sendSuccess } from "../utils/responseHandler.js";
  
  export const suggestRescheduleSlots = asyncHandler(async (req, res) => {
    const suggestion = await generateRescheduleSlots(req.body);
  
    sendSuccess(
      res,
      suggestion,
      "Reschedule suggestions generated successfully",
      201
    );
  });
  
  export const respondToSuggestion = asyncHandler(async (req, res) => {
    const result = await respondToRescheduleSuggestion({
      suggestionId: req.params.suggestionId,
      response: req.body.response,
      selectedSlot: req.body.selectedSlot
    });
  
    sendSuccess(
      res,
      result,
      "Reschedule response saved successfully"
    );
  });
  
  export const getSuggestionsByBooking = asyncHandler(async (req, res) => {
    const suggestions = await getRescheduleSuggestionsByBooking(req.params.bookingId);
  
    sendSuccess(
      res,
      suggestions,
      "Reschedule suggestions retrieved successfully"
    );
  });