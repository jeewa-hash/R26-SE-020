import mongoose from "mongoose";
import Quotation from "../models/Quotation.js";
import Notification from "../models/Notification.js";
import { sendRealtimeNotification } from "../sockets/notificationSocket.js";
import axios from "axios";

const SEEKER_SERVICE_URL = (process.env.SEEKER_SERVICE_URL || "http://localhost:6000").replace(/\/$/, "");

export const createQuotation = async (req, res) => {
  try {
    const providerId = req.user?.id || req.user?._id;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: "Provider authentication required.",
      });
    }

    const {
      providerRequestId,
      price,
      proposedStartTime: suppliedStartTime, // Chaw: added provider proposed job start date/time
      estimatedDurationHours = null, // Legacy compatibility only; new flow predicts duration in Coordination Service
      durationText = "",
      notes = "",
      serviceCategory = "",
      serviceSubcategory = "",
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(providerRequestId)) return res.status(400).json({ message: 'A valid request ID is required.' });
    if (!Number.isFinite(Number(price)) || Number(price) <= 0) return res.status(400).json({ message: 'Price must be a number greater than zero.' });
    const requestResponse = await axios.get(`${SEEKER_SERVICE_URL}/request-quotations/${providerRequestId}`, { timeout: 10000 });
    const request = requestResponse.data.request || requestResponse.data.data || requestResponse.data;
    if (String(request.providerId) !== String(providerId)) return res.status(403).json({ message: 'This request belongs to another provider.' });
    if (request.rescheduleRequestedAt) return res.status(409).json({ message: 'Waiting for the seeker to choose a new time.' });
    const externalSessionId = request.sessionId;
    const seekerId = request.seekerId;
    const postId = request.postId || null;
    const proposedStartTime = request.preferredStartTime;
    if (!proposedStartTime || !Number.isFinite(new Date(proposedStartTime).getTime()) || new Date(proposedStartTime) <= new Date()) return res.status(400).json({ message: 'Ask the seeker to choose a future start time.' });
    if (suppliedStartTime && new Date(suppliedStartTime).getTime() !== new Date(proposedStartTime).getTime()) return res.status(400).json({ message: 'Only the seeker can choose the start time.' });
    if (request.status !== 'pending') return res.status(409).json({ message: 'This request is not awaiting a quotation.' });
    await Quotation.init();
    const existing = await Quotation.findOne({ providerId, externalSessionId });
    if (existing) return res.status(409).json({ message: 'You have already submitted your one quotation for this session.', quotationId: existing._id });
    const coordinationUrl = (process.env.COORDINATION_SERVICE_URL || 'http://localhost:5010').replace(/\/$/, '');
    await axios.post(`${coordinationUrl}/bid-coordinations/validate-quotation`, { providerRequestId }, {
      headers: { Authorization: req.headers.authorization }, timeout: 30000,
    });

    const providerSnapshot = {
      providerId,
      name:
        req.user?.fullName ||
        req.user?.name ||
        req.user?.businessName ||
        "Service Provider",
      businessName:
        req.user?.businessName ||
        req.user?.companyName ||
        req.user?.name ||
        "",
      phone:
        req.user?.telephone ||
        req.user?.phone ||
        req.user?.mobile ||
        "",
      district: req.user?.district || req.user?.city || "",
      profileImage: req.user?.profileImage || req.user?.avatar || "",
    };

    // 1. Create Quotation in Database
    let quotation = await Quotation.create({
      workflowVersion: 2,
      providerRequestId,
      externalSessionId, // Chaw: save ServiceSession reference
      seekerId,
      postId,
      providerId,
      price,
      proposedStartTime, // Chaw: save provider proposed job start time
      estimatedDurationHours: estimatedDurationHours ?? null, // Legacy field; normal flow leaves this null
      durationText:
        durationText ||
        (estimatedDurationHours != null ? `${estimatedDurationHours} Hours` : ""),
      notes,
      serviceCategory: request.detectedCategory || request.serviceCategory || serviceCategory,
      serviceSubcategory: request.detectedObject || request.serviceSubcategory || serviceSubcategory,
      providerSnapshot,
      status: "SENT",
      coordinationStatus: "NOT_CHECKED", // Chaw: new quotation must be checked by Coordination Service
    });

    // Run coordination before exposing a selectable offer to the seeker.
    let validationPending = false;
    try {
      await axios.post(`${coordinationUrl}/bid-coordinations/check`, {
        externalRequestQuotationId: providerRequestId,
        externalQuotationId: String(quotation._id),
      }, { timeout: 60000 });
      quotation = await Quotation.findById(quotation._id);
      validationPending = !quotation?.coordinationId || ["NOT_CHECKED", "CHECKING"].includes(quotation.coordinationStatus);
    } catch (error) {
      validationPending = true;
      console.error('Quotation validation pending:', error.response?.data?.message || error.message);
    }

    // 2. Persistent Notification for Seeker
    const notification = await Notification.create({
      recipientId: seekerId,
      senderId: providerId,
      type: "NEW_QUOTATION",
      title: "New Service Quotation Received",
      message: `A provider has sent a quotation of LKR ${price} for your request.`,
      metadata: {
        quotationId: quotation._id,
        providerRequestId: providerRequestId,
        externalSessionId: externalSessionId, // Chaw: include session reference in notification metadata
      },
    });

    // 3. Emit Real-time Socket Event to Seeker
    const io = req.app.get("io");
    if (io) {
      sendRealtimeNotification(io, seekerId, notification);
    }

    axios.patch(`${SEEKER_SERVICE_URL}/request-quotations/${providerRequestId}/status`, {
      providerId,
      status: "quoted",
    }).catch((error) => console.warn("REQUEST QUOTATION STATUS WARNING:", error.message));

    return res.status(201).json({
      success: true,
      message: validationPending ? "Quotation saved. Availability validation is pending; retry validation from your quotation." : "Quotation sent to seeker successfully.",
      validationPending,
      data: quotation,
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'You have already submitted your one quotation for this session.' });
    if (error.response) return res.status(error.response.status >= 500 ? 503 : error.response.status).json({ message: error.response.data?.message || 'Availability check failed.', code: error.response.data?.code });
    console.error("CREATE QUOTATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create quotation.",
      error: error.message,
    });
  }
};

export const syncQuotationRequestedTime = async (req, res) => {
  try {
    const quote = await Quotation.findOne({ providerRequestId: req.params.requestId });
    if (!quote) return res.json({ success: true, quotation: null });
    if (String(quote.seekerId) !== String(req.user.id)) return res.status(403).json({ message: 'Only the seeker can change the requested time.' });
    if (quote.status !== 'SENT') return res.status(409).json({ message: 'This quotation is already closed or accepted.' });
    const response = await axios.get(`${SEEKER_SERVICE_URL}/request-quotations/${req.params.requestId}`, { timeout: 10000 });
    const request = response.data.request || response.data.data || response.data;
    const time = new Date(request.preferredStartTime);
    if (!request.preferredStartTime || !Number.isFinite(time.getTime()) || time <= new Date()) return res.status(400).json({ message: 'A future start time is required.' });
    quote.proposedStartTime = time;
    quote.coordinationStatus = 'NOT_CHECKED';
    await quote.save();
    const coordinationUrl = (process.env.COORDINATION_SERVICE_URL || 'http://localhost:5010').replace(/\/$/, '');
    await axios.post(`${coordinationUrl}/bid-coordinations/check`, { externalRequestQuotationId: String(quote.providerRequestId), externalQuotationId: String(quote._id) }, { timeout: 60000 });
    return res.json({ success: true, data: await Quotation.findById(quote._id) });
  } catch (error) { return res.status(503).json({ message: 'The new time was saved; provider validation is pending.' }); }
};

export const retryQuotationValidation = async (req, res) => {
  try {
    const quote = await Quotation.findById(req.params.id);
    if (!quote) return res.status(404).json({ message: 'Quotation not found.' });
    if (String(quote.providerId) !== String(req.user.id)) return res.status(403).json({ message: 'This quotation belongs to another provider.' });
    if (quote.status !== 'SENT') return res.status(409).json({ message: 'Only sent quotations can be validated.' });
    const coordinationUrl = (process.env.COORDINATION_SERVICE_URL || 'http://localhost:5010').replace(/\/$/, '');
    await axios.post(`${coordinationUrl}/bid-coordinations/check`, { externalRequestQuotationId: String(quote.providerRequestId), externalQuotationId: String(quote._id) }, { timeout: 60000 });
    res.json({ success: true, data: await Quotation.findById(quote._id) });
  } catch (error) { res.status(503).json({ message: error.response?.data?.message || 'Validation could not finish. Your quotation and price are saved; try again.' }); }
};

export const getProviderQuotations = async (req, res) => {
  try {
    const providerId = req.user?.id;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: "Provider authentication required.",
      });
    }

    // Populate the providerRequestId to view Seeker's problem breakdown directly
    const quotations = await Quotation.find({ providerId })
      .sort({ createdAt: -1 }); // Chaw: removed populate because related request/user data belongs to other services

    return res.status(200).json({
      success: true,
      count: quotations.length,
      data: quotations,
    });
  } catch (error) {
    console.error("GET PROVIDER QUOTATIONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch provider quotations.",
      error: error.message,
    });
  }
};

export const getQuotationById = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id); // Chaw: removed populate because related request/user data belongs to other services

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: quotation,
    });
  } catch (error) {
    console.error("GET QUOTATION BY ID ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch quotation.",
      error: error.message,
    });
  }
};

export const acceptQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found.",
      });
    }

    if (quotation.status === "ACCEPTED") {
      return res.status(200).json({ success: true, message: "Quotation is already accepted.", data: quotation });
    }

    const acceptedForSession = await Quotation.findOne({
      externalSessionId: quotation.externalSessionId,
      seekerId: quotation.seekerId,
      status: "ACCEPTED",
      _id: { $ne: quotation._id },
    });
    if (acceptedForSession) {
      return res.status(409).json({ success: false, message: "A quotation has already been accepted for this service." });
    }

    if (quotation.status !== "SENT") {
      return res.status(400).json({
        success: false,
        message: "Only pending/sent quotations can be accepted.",
      });
    }

    if ( // Chaw: prevent accepting quotation before coordination validation
      !["CAN_ACCEPT", "AVAILABLE_WITH_CAUTION"].includes(
        quotation.coordinationStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Quotation must pass coordination before acceptance. Please run bid coordination first.", // Chaw: acceptance now depends on coordination result
      });
    }

    quotation.status = "ACCEPTED";
    quotation.acceptedAt = new Date();
    await quotation.save();

    await Quotation.updateMany(
      {
        externalSessionId: quotation.externalSessionId,
        seekerId: quotation.seekerId,
        _id: { $ne: quotation._id },
        status: "SENT",
      },
      {
        $set: {
          status: "REJECTED",
          rejectedAt: new Date(),
          rejectionReason: "Seeker selected another provider",
        },
      }
    );

    try {
      await axios.patch(
        `${SEEKER_SERVICE_URL}/request-quotations/session/${encodeURIComponent(quotation.externalSessionId)}/selection`,
        { seekerId: quotation.seekerId, acceptedRequestId: quotation.providerRequestId }
      );
    } catch (error) {
      console.warn("REQUEST QUOTATION SELECTION WARNING:", error.message);
    }

    // Notify Provider that Seeker accepted
    const notification = await Notification.create({
      recipientId: quotation.providerId,
      senderId: req.user.id,
      type: "QUOTE_ACCEPTED",
      title: "Quotation Accepted!",
      message: `Your quotation for LKR ${quotation.price} was accepted by the seeker.`,
      metadata: { quotationId: quotation._id },
    });

    const io = req.app.get("io");
    if (io) {
      sendRealtimeNotification(io, quotation.providerId, notification);
    }

    return res.status(200).json({
      success: true,
      message: "Quotation accepted successfully.",
      data: quotation,
    });
  } catch (error) {
    console.error("ACCEPT QUOTATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to accept quotation.",
      error: error.message,
    });
  }
};

export const updateQuotationCoordination = async (req, res) => { // Chaw: endpoint for Coordination Service to update quotation coordination result
  try {
    const { id } = req.params;

    const {
      coordinationStatus,
      coordinationId,
      coordinatedStartTime,
      coordinatedEndTime,
      quotationStatus,
    } = req.body; // Chaw: allow Coordination Service to update final time and quotation lifecycle status

    const allowedCoordinationStatuses = [
      "NOT_CHECKED",
      "CHECKING",
      "CAN_ACCEPT",
      "AVAILABLE_WITH_CAUTION",
      "NEEDS_RESCHEDULE",
      "CONFLICT_DETECTED",
      "REJECTED_BY_COORDINATION",
      "RESCHEDULE_REQUIRED",
      "REJECTED_DUE_TO_CONFLICT",
      "NOT_AVAILABLE",
      "CONFLICT_FOUND",
    ];

    const allowedQuotationStatuses = [
      "SENT",
      "COUNTER_OFFERED",
      "ACCEPTED",
      "REJECTED",
      "EXPIRED",
      "CANCELLED",
    ];

    if (!allowedCoordinationStatuses.includes(coordinationStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordination status.",
      });
    }

    if (
      quotationStatus &&
      !allowedQuotationStatuses.includes(quotationStatus)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid quotation status.",
      });
    }

    const updateData = {
      coordinationStatus,
      coordinationId: coordinationId || null,
      coordinatedStartTime: coordinatedStartTime || null,
      coordinatedEndTime: coordinatedEndTime || null,
    };

    if (coordinatedStartTime) updateData.proposedStartTime = coordinatedStartTime;

    if (quotationStatus) {
      updateData.status = quotationStatus; // Chaw: mark quotation ACCEPTED after booking is created
    }

    const quotation = await Quotation.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    );

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Quotation coordination status updated.",
      data: quotation,
    });
  } catch (error) {
    console.error("UPDATE QUOTATION COORDINATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update quotation coordination.",
      error: error.message,
    });
  }
};

export const getQuotationsBySession = async (req, res) => {
  try {
    const quotations = await Quotation.find({ externalSessionId: req.params.sessionId })
      .sort({ price: 1, createdAt: 1 });
    return res.status(200).json({ success: true, count: quotations.length, data: quotations });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to fetch session quotations.", error: error.message });
  }
};

export const getSeekerQuotations = async (req, res) => {
  try {
    const seekerId = req.user?.id;

    if (!seekerId) {
      return res.status(401).json({
        success: false,
        message: "Invalid seeker ID",
      });
    }

    const quotations = await Quotation.find({ seekerId }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: quotations.length,
      data: quotations,
    });
  } catch (error) {
    console.error("GET SEEKER QUOTATIONS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch seeker quotations.",
      error: error.message,
    });
  }
};
