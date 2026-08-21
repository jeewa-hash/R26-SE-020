import Notification from "../models/Notification.js";
import { sendRealtimeNotification } from "../sockets/notificationSocket.js";

// Endpoint or internal handler to create notifications
export const createNotification = async (req, res) => {
  try {
    const { recipientId, senderId, type, title, message, metadata } = req.body;

    if (!recipientId || !senderId || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        message: "recipientId, senderId, type, title, and message are required.",
      });
    }

    // 1. Save Notification to Database
    const notification = await Notification.create({
      recipientId,
      senderId,
      type,
      title,
      message,
      metadata,
    });

    // 2. Dispatch socket event if user is active
    const io = req.app.get("io");
    let isDelivered = false;
    if (io) {
      isDelivered = sendRealtimeNotification(io, recipientId, notification);
    }

    return res.status(201).json({
      success: true,
      message: "Notification created successfully.",
      data: notification,
      realtimeDelivered: isDelivered,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create notification.",
      error: error.message,
    });
  }
};

// GET /api/notifications (Fetch recipient's notification history)
export const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const notifications = await Notification.find({ recipientId: userId })
      .populate("senderId", "name email")
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      unreadCount,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notifications.",
      error: error.message,
    });
  }
};

// PATCH /api/notifications/:id/read (Mark a single notification as read)
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      data: notification,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update notification.",
      error: error.message,
    });
  }
};