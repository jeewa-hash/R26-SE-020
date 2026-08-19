// controllers/jobStatusController.js
import JobStatus from "../models/JobStatus.js";

// POST /api/provider/jobs/:postId/apply
export const applyToJobPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { providerId, seekerId, jobTitle, jobCategory, jobLocation } = req.body;

    if (!providerId) {
      return res.status(400).json({ success: false, error: "providerId is required" });
    }

    const existing = await JobStatus.findOne({ postId, providerId, status: "applied" });
    if (existing) {
      return res.status(409).json({ success: false, error: "You have already applied to this job" });
    }

    const jobStatus = await JobStatus.create({
      postId,
      providerId,
      seekerId: seekerId || null,
      jobTitle: jobTitle || "",
      jobCategory: jobCategory || "",
      jobLocation: jobLocation || "",
      status: "applied",
    });

    res.status(201).json({ success: true, message: "Applied successfully", data: jobStatus });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, error: "You have already applied to this job" });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

// POST /api/provider/jobs/:postId/cancel
export const cancelJobApplication = async (req, res) => {
  try {
    const { postId } = req.params;
    const { providerId } = req.body;

    if (!providerId) {
      return res.status(400).json({ success: false, error: "providerId is required" });
    }

    const jobStatus = await JobStatus.findOne({ postId, providerId, status: "applied" });
    if (!jobStatus) {
      return res.status(404).json({ success: false, error: "No active application found for this job" });
    }

    jobStatus.status = "cancelled";
    jobStatus.statusUpdatedAt = new Date();
    await jobStatus.save();

    res.status(200).json({ success: true, message: "Application cancelled", data: jobStatus });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// PUT /api/provider/jobs/:id/status  (e.g. seeker accepted/rejected the provider, or job completed)
export const updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["applied", "accepted", "rejected", "cancelled", "completed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const jobStatus = await JobStatus.findByIdAndUpdate(
      id,
      { status, statusUpdatedAt: new Date() },
      { new: true }
    );

    if (!jobStatus) {
      return res.status(404).json({ success: false, error: "Job status record not found" });
    }

    res.status(200).json({ success: true, data: jobStatus });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/provider/jobs/provider/:providerId?status=applied
export const getJobsByProvider = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { status } = req.query;

    const filter = { providerId };
    if (status) filter.status = status;

    const jobs = await JobStatus.find(filter).sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: jobs.length, data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET /api/provider/jobs/:id
export const getJobStatusById = async (req, res) => {
  try {
    const jobStatus = await JobStatus.findById(req.params.id);
    if (!jobStatus) {
      return res.status(404).json({ success: false, error: "Job status record not found" });
    }
    res.status(200).json({ success: true, data: jobStatus });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};