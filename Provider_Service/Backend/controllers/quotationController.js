import Quotation from "../models/Quotation.js";
import Notification from "../models/Notification.js";
import { sendRealtimeNotification } from "../sockets/notificationSocket.js";

export const createQuotation = async (req, res) => {
  try {
    const providerId = req.user?.id;

    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: "Provider authentication required.",
      });
    }

    const {
      providerRequestId,
      externalSessionId, // Chaw: added ServiceSession ID from seeker/request flow
      seekerId,
      postId = null,
      price,
      proposedStartTime, // Chaw: added provider proposed job start date/time
      estimatedDurationHours, // Chaw: added numeric duration for coordination calculation
      durationText = "",
      notes = "",
    } = req.body;

    // Validate essential parameters from the Seeker's request payload
    if (
      !providerRequestId ||
      !externalSessionId || // Chaw: required to link quotation to ServiceSession
      !seekerId ||
      price == null ||
      !proposedStartTime || // Chaw: required for scheduling/conflict validation
      estimatedDurationHours == null // Chaw: required to calculate proposed end time
    ) {
      return res.status(400).json({
        success: false,
        message:
          "providerRequestId, externalSessionId, seekerId, price, proposedStartTime, and estimatedDurationHours are required.", // Chaw: updated validation message
      });
    }

    if (Number(price) < 0) { // Chaw: validate quotation amount
      return res.status(400).json({
        success: false,
        message: "price cannot be negative.",
      });
    }

    if (Number(estimatedDurationHours) <= 0) { // Chaw: validate numeric duration
      return res.status(400).json({
        success: false,
        message: "estimatedDurationHours must be greater than 0.",
      });
    }

    if (Number.isNaN(new Date(proposedStartTime).getTime())) { // Chaw: validate proposed start time
      return res.status(400).json({
        success: false,
        message: "Invalid proposedStartTime.",
      });
    }

    // 1. Create Quotation in Database
    const quotation = await Quotation.create({
      providerRequestId,
      externalSessionId, // Chaw: save ServiceSession reference
      seekerId,
      postId,
      providerId,
      price,
      proposedStartTime, // Chaw: save provider proposed job start time
      estimatedDurationHours, // Chaw: save numeric duration for coordination
      durationText: durationText || `${estimatedDurationHours} Hours`, // Chaw: auto-generate display text if missing
      notes,
      status: "SENT",
      coordinationStatus: "NOT_CHECKED", // Chaw: new quotation must be checked by Coordination Service
    });

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

    return res.status(201).json({
      success: true,
      message: "Quotation sent to seeker successfully.",
      data: quotation,
    });
  } catch (error) {
    console.error("CREATE QUOTATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create quotation.",
      error: error.message,
    });
  }
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
    await quotation.save();

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
      message: "Quotation accepted.",
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

export const updateQuotationCoordination = async (req, res) => { // Chaw: added endpoint for Coordination Service to update quotation result
  try {
    const { id } = req.params;
    const { coordinationStatus, coordinationId, coordinatedStartTime, coordinatedEndTime, } = req.body;
    // Chaw: allow Coordination Service to send final selected slot time
    const allowedStatuses = [ // Chaw: allowed coordination states from scheduling engine
      "NOT_CHECKED",
      "CHECKING",
      "CAN_ACCEPT",
      "AVAILABLE_WITH_CAUTION",
      "RESCHEDULE_REQUIRED",
      "REJECTED_DUE_TO_CONFLICT",
    ];

    if (!allowedStatuses.includes(coordinationStatus)) { // Chaw: validate coordination status before saving
      return res.status(400).json({
        success: false,
        message: "Invalid coordination status.",
      });
    }

    const quotation = await Quotation.findByIdAndUpdate(
      id,
      {
        coordinationStatus, // Chaw: save final coordination decision
        coordinationId: coordinationId || null, // Chaw: link to BidCoordination record in Coordination Service
        coordinatedStartTime: coordinatedStartTime || null, // Chaw: save final coordinated start time when selected
        coordinatedEndTime: coordinatedEndTime || null, // Chaw: save final coordinated end time when selected
      },
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