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
