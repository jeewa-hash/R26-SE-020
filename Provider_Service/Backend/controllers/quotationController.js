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
      seekerId,
      postId = null,
      price,
      durationText = "",
      notes = "",
    } = req.body;

    // Validate essential parameters from the Seeker's request payload
    if (!providerRequestId || !seekerId || price == null) {
      return res.status(400).json({
        success: false,
        message: "providerRequestId, seekerId, and price are required.",
      });
    }

    // 1. Create Quotation in Database
    const quotation = await Quotation.create({
      providerRequestId,
      seekerId,
      postId,
      providerId,
      price,
      durationText,
      notes,
      status: "SENT",
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
      .populate("providerRequestId")
      .populate("seekerId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: quotations.length,
      data: quotations,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch provider quotations.",
      error: error.message,
    });
  }
};

export const getQuotationById = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate("providerRequestId")
      .populate("providerId", "name email")
      .populate("seekerId", "name email");

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
    return res.status(500).json({
      success: false,
      message: "Failed to accept quotation.",
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

    const quotations = await Quotation.find({ seekerId })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: quotations.length,
      data: quotations,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch seeker quotations.",
      error: error.message,
    });
  }
};