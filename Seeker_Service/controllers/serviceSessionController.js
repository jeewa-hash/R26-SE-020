import mongoose from "mongoose";
import ServiceSession from "../models/ServiceSession.js";

const normalize = (document) => {
  const item = document?.toObject ? document.toObject() : document;
  return {
    ...item,
    sessionId: item?.sessionId || item?.session_id || item?.id || "",
    title: item?.title || item?.object_name || item?.object || item?.service_type || "Service Request",
    detectedObject: item?.detectedObject || item?.object_name || item?.object || item?.service_type || "",
    detectedCategory: item?.detectedCategory || item?.category || "",
    serviceSubcategory: item?.serviceSubcategory || item?.sub_service_type || item?.specific_issue || item?.service_type || "",
    briefDescription: item?.briefDescription || item?.details || item?.specific_issue || "",
    serviceLocation: item?.serviceLocation || item?.location_address || item?.location?.address || item?.location || "",
    createdAt: item?.createdAt || item?.created_at || null,
  };
};

export const createServiceSession = async (req, res) => {
  try {
    if (req.user?.role !== "Seeker") {
      return res.status(403).json({ success: false, message: "Only seekers can create service sessions" });
    }

    const seekerId = String(req.user.id || "");
    if (!mongoose.Types.ObjectId.isValid(seekerId)) {
      return res.status(400).json({ success: false, message: "Invalid seeker ID" });
    }

    const {
      sessionId: suppliedSessionId,
      id: suppliedId,
      category = "other",
      detectedCategory = category,
      object = "Service Request",
      detectedObject = object,
      confidence = "",
      flowGroup = "General",
      language = "en",
      answers = {},
      currentStep = 0,
      briefDescription = "",
      serviceSubcategory = "",
      serviceLocation = "",
      preferredStartTime = null,
      preferredEndTime = null,
    } = req.body;

    const sessionId = String(suppliedSessionId || suppliedId || `DEMO-${Date.now()}`).trim();
    if (!sessionId || !detectedCategory || !detectedObject) {
      return res.status(400).json({ success: false, message: "sessionId, category and object are required" });
    }
    if (preferredStartTime && Number.isNaN(new Date(preferredStartTime).getTime())) {
      return res.status(400).json({ success: false, message: "Invalid preferredStartTime" });
    }
    if (preferredEndTime && Number.isNaN(new Date(preferredEndTime).getTime())) {
      return res.status(400).json({ success: false, message: "Invalid preferredEndTime" });
    }
    if (preferredStartTime && preferredEndTime && new Date(preferredStartTime) >= new Date(preferredEndTime)) {
      return res.status(400).json({ success: false, message: "preferredEndTime must be after preferredStartTime" });
    }

    const existing = await ServiceSession.findOne({
      $or: [{ sessionId }, { id: sessionId }, { session_id: sessionId }],
    });
    if (existing) {
      return res.status(409).json({ success: false, message: "Service session already exists", session: normalize(existing) });
    }

    const session = await ServiceSession.create({
      id: sessionId,
      sessionId,
      seekerId,
      seeker_id: seekerId,
      answers,
      category: detectedCategory,
      detectedCategory,
      confidence,
      current_step: Number(currentStep) || 0,
      flow_group: flowGroup,
      language,
      object: detectedObject,
      detectedObject,
      briefDescription,
      serviceSubcategory,
      serviceLocation,
      preferredStartTime: preferredStartTime || null,
      preferredEndTime: preferredEndTime || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Service session created successfully",
      session: normalize(session),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create service session", error: error.message });
  }
};

export const getSeekerServiceSessions = async (req, res) => {
  try {
    const seekerId = req.params.seekerId;
    if (!mongoose.Types.ObjectId.isValid(seekerId)) {
      return res.status(400).json({ success: false, message: "Invalid seeker ID" });
    }
    const sessions = await ServiceSession.find({
      $or: [
        { seekerId },
        { seeker_id: seekerId },
        { "seeker.id": seekerId },
      ],
    }).sort({ createdAt: -1, created_at: -1, _id: -1 });
    return res.json({ success: true, count: sessions.length, sessions: sessions.map(normalize) });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to load service sessions", error: error.message });
  }
};
