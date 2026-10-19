import Booking from '../models/Booking.js';
import BidScheduleEvaluation from '../models/BidScheduleEvaluation.js';

export async function getProviderTaskHistory(req, res) {
  try {
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - 30 * 86400000);
    const bookings = await Booking.find({ providerId: req.user.id, bookingStatus: 'COMPLETED',
      $or: [{ completedAt: { $gte: windowStart, $lte: windowEnd } }, { completedAt: null, actualEndTime: { $gte: windowStart, $lte: windowEnd } }],
    }).select('_id bidCoordinationId').lean();
    const evaluations = await BidScheduleEvaluation.find({ bidCoordinationId: { $in: bookings.map(row => row.bidCoordinationId).filter(Boolean) } }).select('bidCoordinationId modelEvidence updatedAt').sort({ updatedAt: -1 }).lean();
    const byCoordination = new Map();
    for (const row of evaluations) if (!byCoordination.has(String(row.bidCoordinationId))) byCoordination.set(String(row.bidCoordinationId), row.modelEvidence?.submittedPayload);
    const tasks = new Map();
    let unmatchedCompletedJobs = 0;
    for (const booking of bookings) {
      const task = byCoordination.get(String(booking.bidCoordinationId));
      if (!task?.serviceCategory || !task?.serviceType || !task?.taskName) { unmatchedCompletedJobs++; continue; }
      const key = JSON.stringify([task.serviceCategory, task.serviceType, task.taskName]);
      if (!tasks.has(key)) tasks.set(key, { serviceCategory: task.serviceCategory, serviceType: task.serviceType, taskName: task.taskName, completedCount: 0 });
      tasks.get(key).completedCount++;
    }
    return res.json({ windowStart, windowEnd, tasks: [...tasks.values()], unmatchedCompletedJobs, source: 'Completed platform bookings in the last 30 days' });
  } catch { return res.status(503).json({ message: 'Completed task history is unavailable. Please retry.' }); }
}
