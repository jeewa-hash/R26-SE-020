import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/responseHandler.js";
import {
  acceptBidCoordinationById,
  createBookingFromAcceptedBid,
  getBidCoordinationById,
  rejectBidCoordinationById,
  runBidCoordinationCheck,
} from "../services/bidCoordinationService.js";

export const checkBidCoordination = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    seekerId: req.user.id,
  };
  const data = await runBidCoordinationCheck(payload);
  sendSuccess(res, data, "Bid coordination completed");
});

export const acceptBidCoordination = asyncHandler(async (req, res) => {
  const existing = await getBidCoordinationById(req.params.id);
  if (!existing) {
    res.status(404);
    throw new Error("Bid coordination record not found");
  }
  if (String(existing.seekerId) !== String(req.user.id)) {
    res.status(403);
    throw new Error("You can only accept your own bid coordination records");
  }
  const data = await acceptBidCoordinationById(req.params.id);
  sendSuccess(res, data, "Bid coordination accepted");
});

export const rejectBidCoordination = asyncHandler(async (req, res) => {
  const existing = await getBidCoordinationById(req.params.id);
  if (!existing) {
    res.status(404);
    throw new Error("Bid coordination record not found");
  }
  if (String(existing.seekerId) !== String(req.user.id)) {
    res.status(403);
    throw new Error("You can only reject your own bid coordination records");
  }
  const data = await rejectBidCoordinationById(req.params.id);
  sendSuccess(res, data, "Bid coordination rejected");
});

export const createBookingFromBidCoordination = asyncHandler(async (req, res) => {
  const existing = await getBidCoordinationById(req.params.bidCoordinationId);
  if (!existing) {
    res.status(404);
    throw new Error("Bid coordination record not found");
  }
  if (String(existing.seekerId) !== String(req.user.id)) {
    res.status(403);
    throw new Error("You can only create bookings from your own accepted bids");
  }
  const data = await createBookingFromAcceptedBid(req.params.bidCoordinationId);
  sendSuccess(res, data, "Booking created from accepted bid", 201);
});
