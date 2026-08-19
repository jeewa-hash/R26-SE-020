const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const Inquiry = require('../models/Inquiry');
const Provider = require('../models/Provider');

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'assigmentgroupy@gmail.com',
    pass: process.env.SMTP_PASS || 'iehl zcwp pdmy anld',
  },
});

// Secondary mongoose connection to Coordination Database if available
let coordinationDb = null;
if (process.env.COORDINATION_MONGO_URI) {
  try {
    coordinationDb = mongoose.createConnection(process.env.COORDINATION_MONGO_URI);
    coordinationDb.on('connected', () => console.log('✅ Coordination DB Connected for Booking inquiries'));
    coordinationDb.on('error', (err) => console.log('⚠️ Coordination DB Connection error:', err.message));
  } catch (err) {
    console.log('Coordination DB init error:', err.message);
  }
}

// Helper to send suspension email on 3 consecutive rejections
async function sendSuspensionEmail(toEmail, providerName, adminNote) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Work Wave <noreply@workwave.com>',
    to: toEmail,
    subject: '⚠️ Account Suspended: 3 Consecutive Inquiries Rejected - Work Wave',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #333; border: 1px solid #fee2e2; border-radius: 12px;">
        <h2 style="color: #ef4444; margin-top: 0;">Account Suspended Notice</h2>
        <p>Dear <strong>${providerName || 'Service Provider'}</strong>,</p>
        <p>Your recent service cancellation inquiries (3 consecutive inquiries) have been <strong>REJECTED</strong> by the Administration due to invalid or insufficient reasons for missed services.</p>
        
        <div style="background-color: #fee2e2; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ef4444;">
          <strong>Admin Note:</strong><br/>
          <span>${adminNote || 'No acceptable proof or valid justification was provided for consecutive job cancellations.'}</span>
        </div>

        <h3 style="color: #b91c1c; margin-bottom: 8px;">Suspension Policy Enforcement:</h3>
        <ul style="padding-left: 20px; line-height: 1.6;">
          <li>Your account has been <strong>automatically suspended for 1 Month (30 Days)</strong>.</li>
          <li>You cannot accept new bookings or send proposals to client posts during this period.</li>
        </ul>

        <div style="background-color: #f3f4f6; padding: 18px; border-radius: 8px; margin: 20px 0; border: 1px dashed #d1d5db;">
          <h4 style="margin-top: 0; color: #111827;">How to Appeal & Request Early Unblock:</h4>
          <p style="margin-bottom: 8px;">If you have valid justifications, official medical records, or genuine emergency evidence to appeal this suspension, please email your explanation and evidence directly to:</p>
          <p style="font-size: 16px; font-weight: bold; color: #4f46e5; margin: 10px 0;">
            📧 nethmiumaya5@gmail.com
          </p>
          <p style="font-size: 13px; color: #6b7280; margin-bottom: 0;">Our Admin team will review your appeal and may manually unblock your account.</p>
        </div>

        <p style="font-size: 13px; color: #6b7280;">If no appeal is approved, your account will be automatically unblocked after the 1-month penalty period expires.</p>
        <br/>
        <p>Best regards,<br/><strong>Work Wave Governance Team</strong></p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Consecutive rejection penalty email sent to ${toEmail}:`, info.messageId);
    return info;
  } catch (err) {
    console.error('[Email] Failed to send penalty email:', err.message);
  }
}

/**
 * 1. GET /api/inquiries/missed-bookings/:providerId
 * Get cancelled bookings needing an inquiry for a provider
 * (Excludes bookings where an inquiry was Approved)
 * Also returns unsubmittedCount, pendingInquiriesCount, and restriction status.
 */
exports.getProviderMissedBookings = async (req, res) => {
  try {
    const { providerId } = req.params;

    const provider = await Provider.findById(providerId).select('-password');
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    // Auto-check 1-month unblock on query
    if (provider.isBlocked && provider.blockedUntil && new Date() >= new Date(provider.blockedUntil)) {
      provider.isBlocked = false;
      provider.blockedUntil = null;
      provider.consecutiveRejections = 0;
      provider.blockReason = '';
      provider.lastUnblockedAt = new Date();
      await provider.save();
    }

    // 1. Get inquiries submitted by this provider (only consider ones after lastUnblockedAt if penalty was served)
    const existingInquiries = await Inquiry.find({ providerId });
    const validInquiries = existingInquiries.filter(inq => {
      if (!provider.lastUnblockedAt) return true;
      return new Date(inq.createdAt) >= new Date(provider.lastUnblockedAt);
    });
    
    // Set of bookingIds that are already approved
    const approvedBookingIds = new Set();
    const pendingBookingIds = new Set();
    let pendingInquiriesCount = 0;

    validInquiries.forEach((inq) => {
      if (inq.status === 'Approved') {
        inq.missedServices.forEach((s) => approvedBookingIds.add(s.bookingId));
      } else if (inq.status === 'Submitted' || inq.status === 'Pending') {
        pendingInquiriesCount += 1;
        inq.missedServices.forEach((s) => pendingBookingIds.add(s.bookingId));
      }
    });

    let rawMissedBookings = [];

    // Query Coordination DB if available
    if (coordinationDb && coordinationDb.readyState === 1) {
      try {
        const bookingsColl = coordinationDb.collection('bookings');
        
        // Find bookings that are:
        // 1. Explicitly CANCELLED (excluding seeker cancellations)
        // 2. Uncompleted (CONFIRMED, DELAY_REPORTED, IN_PROGRESS, RESCHEDULING_REQUIRED, RESCHEDULED) that are 24h overdue past scheduled duration
        const relevantBookings = await bookingsColl.find({
          providerId: new mongoose.Types.ObjectId(providerId),
          bookingStatus: {
            $in: ['CANCELLED', 'CONFIRMED', 'DELAY_REPORTED', 'IN_PROGRESS', 'RESCHEDULING_REQUIRED', 'RESCHEDULED'],
          },
          'cancellationInfo.cancelledBy': { $ne: 'SEEKER' },
          cancelledBy: { $ne: 'SEEKER' },
          cancelledBySeeker: { $ne: true },
        }).sort({ scheduledDate: -1, createdAt: -1 }).toArray();

        rawMissedBookings = relevantBookings
          .filter(b => {
            const cancelledBy = (b.cancellationInfo?.cancelledBy || b.cancelledBy || '').toUpperCase();
            if (cancelledBy === 'SEEKER' || b.cancelledBySeeker === true) return false;

            // If provider completed a 1-month penalty, ignore past bookings from before lastUnblockedAt
            if (provider.lastUnblockedAt) {
              const bTime = b.scheduledDate ? new Date(b.scheduledDate).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
              if (bTime < new Date(provider.lastUnblockedAt).getTime()) return false;
            }

            if (b.bookingStatus === 'CANCELLED') return true;

            // Check if 24 hours overdue past duration
            try {
              if (!b.scheduledDate) return false;
              let dateTimeStr = b.scheduledDate;
              if (b.startTime) dateTimeStr += ' ' + b.startTime;
              else dateTimeStr += ' 00:00';
              const startTimeMs = new Date(dateTimeStr).getTime();
              if (isNaN(startTimeMs)) {
                if (b.createdAt) {
                  return (Date.now() - new Date(b.createdAt).getTime()) > (24 * 60 * 60 * 1000);
                }
                return false;
              }
              const durationHours = b.estimatedDurationHours || 1;
              const deadlineMs = startTimeMs + (durationHours * 60 * 60 * 1000) + (24 * 60 * 60 * 1000);
              return Date.now() >= deadlineMs;
            } catch (err) {
              return false;
            }
          })
          .map((b) => {
            const isAutoExpired = b.bookingStatus !== 'CANCELLED';
            const reason = isAutoExpired
              ? (b.bookingStatus === 'RESCHEDULED'
                  ? 'Rescheduled service not attended (Auto-cancelled after 24h)'
                  : `Service not completed within 24h past scheduled duration (Provider No-show - status was ${b.bookingStatus})`)
              : (b.cancellationReason || b.delayInfo?.delayReason || 'Cancelled by provider');

            return {
              bookingId: b._id.toString(),
              date: b.scheduledDate || (b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : '2024-05-01'),
              time: b.startTime ? `${b.startTime} - ${b.endTime || ''}` : '10:00 AM',
              location: b.location?.address || b.location?.city || 'Colombo',
              reason,
              cancelledBy: b.cancellationInfo?.cancelledBy || b.cancelledBy || 'PROVIDER',
              status: b.bookingStatus,
              isAutoExpired,
            };
          });
      } catch (dbErr) {
        console.log('Error querying coordination bookings:', dbErr.message);
      }
    }

    // Filter out approved bookings (Rule: "inquire eka approve kalpth ethana pennanna epa")
    let missedBookingsNeedingInquiry = rawMissedBookings.filter(
      (b) => !approvedBookingIds.has(b.bookingId)
    );

    const unsubmittedCount = missedBookingsNeedingInquiry.filter(b => !pendingBookingIds.has(b.bookingId)).length;
    
    // Restriction Rule: if unsubmittedCount >= 3 OR pendingInquiriesCount >= 3 OR combined >= 3
    const isRestricted = unsubmittedCount >= 3 || pendingInquiriesCount >= 3 || (unsubmittedCount + pendingInquiriesCount) >= 3 || provider.isBlocked;

    return res.status(200).json({
      success: true,
      provider: {
        id: provider._id,
        name: provider.name || provider.email.split('@')[0],
        email: provider.email,
        isBlocked: provider.isBlocked,
        blockedUntil: provider.blockedUntil,
        consecutiveRejections: provider.consecutiveRejections || 0,
      },
      missedBookings: missedBookingsNeedingInquiry,
      unsubmittedCount,
      pendingInquiriesCount,
      isRestricted,
      restrictionMessage: isRestricted
        ? (provider.isBlocked 
            ? `Your account is suspended until ${provider.blockedUntil ? new Date(provider.blockedUntil).toLocaleDateString() : 'Admin unblocks'}. Appeal by emailing nethmiumaya5@gmail.com.`
            : 'Your account is restricted from accepting new bookings or submitting proposals due to 3 or more unaddressed/pending service cancellations. Please submit inquiries to restore access.')
        : null,
    });
  } catch (error) {
    console.error('getProviderMissedBookings Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * 2. POST /api/inquiries
 * Submit an inquiry from Provider App
 */
exports.submitInquiry = async (req, res) => {
  try {
    const { providerId, providerName, providerEmail, providerAvatar, providerRole, reason, missedServices, evidenceImages } = req.body;

    if (!providerId || !reason) {
      return res.status(400).json({ success: false, message: 'providerId and reason are required' });
    }

    const provider = await Provider.findById(providerId);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    let parsedMissedServices = [];
    if (typeof missedServices === 'string') {
      try { parsedMissedServices = JSON.parse(missedServices); } catch(e) { parsedMissedServices = []; }
    } else if (Array.isArray(missedServices)) {
      parsedMissedServices = missedServices;
    }

    // Collect uploaded file URLs if uploaded via multer
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(f => `/uploads/${f.filename}`);
    } else if (evidenceImages) {
      images = Array.isArray(evidenceImages) ? evidenceImages : [evidenceImages];
    }

    const newInquiry = new Inquiry({
      providerId: provider._id,
      providerName: providerName || provider.name || provider.email.split('@')[0],
      providerEmail: providerEmail || provider.email,
      providerAvatar: providerAvatar || provider.profileImage || '',
      providerRole: providerRole || provider.category || 'Service Provider',
      missedServices: parsedMissedServices.length > 0 ? parsedMissedServices : [
        { bookingId: 'MS-1', date: new Date().toISOString().split('T')[0], time: '10:00 AM', location: provider.district || 'Colombo' }
      ],
      reason: reason.trim(),
      evidenceImages: images,
      status: 'Submitted',
    });

    await newInquiry.save();

    return res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully and is pending admin review.',
      data: newInquiry,
    });
  } catch (error) {
    console.error('submitInquiry Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to submit inquiry', error: error.message });
  }
};

/**
 * 3. GET /api/inquiries
 * Get all inquiries for Admin Dashboard
 */
exports.getAllInquiries = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status) {
      query.status = status;
    }

    const inquiries = await Inquiry.find(query).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: inquiries.length,
      data: inquiries,
    });
  } catch (error) {
    console.error('getAllInquiries Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to get inquiries', error: error.message });
  }
};

/**
 * 4. PUT /api/inquiries/:id/review
 * Admin reviews an inquiry (Itemized per missed booking OR bulk Approve / Reject)
 * If 3 consecutive rejections -> auto-block 1 month & send email to provider
 */
exports.reviewInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNote, adminId, itemReviews } = req.body;

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found' });
    }

    // 1. Process Item-by-Item Review if itemReviews array is passed
    if (itemReviews && Array.isArray(itemReviews) && itemReviews.length > 0) {
      inquiry.missedServices = inquiry.missedServices.map((service) => {
        const review = itemReviews.find((r) => r.bookingId === service.bookingId);
        if (review) {
          return {
            bookingId: service.bookingId,
            date: service.date,
            time: service.time,
            location: service.location,
            reason: service.reason,
            status: review.status || service.status || 'Approved',
            adminNote: review.adminNote || '',
          };
        }
        return service;
      });

      // Derive overall status from item reviews
      const allApproved = inquiry.missedServices.every((s) => s.status === 'Approved');
      const allRejected = inquiry.missedServices.every((s) => s.status === 'Rejected');
      
      inquiry.status = allApproved ? 'Approved' : (allRejected ? 'Rejected' : 'Approved');
      inquiry.adminNote = adminNote || (allApproved ? 'All missed services approved.' : (allRejected ? 'All missed services rejected.' : 'Some missed services approved.'));
    } else if (status) {
      if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Status must be Approved or Rejected' });
      }
      inquiry.status = status;
      inquiry.adminNote = adminNote || '';

      // Update all individual missedServices to this status
      inquiry.missedServices = inquiry.missedServices.map((service) => ({
        bookingId: service.bookingId,
        date: service.date,
        time: service.time,
        location: service.location,
        reason: service.reason,
        status: status,
        adminNote: adminNote || '',
      }));
    }

    inquiry.reviewedAt = new Date();
    if (adminId) inquiry.reviewedBy = adminId;
    await inquiry.save();

    // 2. Sync to Coordination DB bookings collection if available
    if (coordinationDb && coordinationDb.readyState === 1) {
      try {
        const bookingsColl = coordinationDb.collection('bookings');
        for (const s of inquiry.missedServices) {
          if (s.bookingId && mongoose.Types.ObjectId.isValid(s.bookingId)) {
            await bookingsColl.updateOne(
              { _id: new mongoose.Types.ObjectId(s.bookingId) },
              { $set: { 'cancellationInfo.inquiryStatus': s.status === 'Approved' ? 'APPROVED' : 'REJECTED' } }
            );
          }
        }
      } catch (cDbErr) {
        console.log('Error updating coordination bookings inquiryStatus:', cDbErr.message);
      }
    }

    const provider = await Provider.findById(inquiry.providerId);
    let autoBlocked = false;

    if (provider) {
      const hasAnyApproval = inquiry.missedServices.some((s) => s.status === 'Approved') || inquiry.status === 'Approved';
      const isAllRejected = inquiry.missedServices.every((s) => s.status === 'Rejected') || inquiry.status === 'Rejected';

      if (hasAnyApproval && !isAllRejected) {
        // At least one approved: reset consecutive rejections
        provider.consecutiveRejections = 0;
        await provider.save();
      } else if (isAllRejected) {
        // Increment consecutive rejections
        provider.consecutiveRejections = (provider.consecutiveRejections || 0) + 1;

        if (provider.consecutiveRejections >= 3) {
          // Automatic 1 Month (30 Days) Block
          const oneMonthLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          provider.isBlocked = true;
          provider.blockedUntil = oneMonthLater;
          provider.blockReason = '3 consecutive inquiry rejections for missed services';
          autoBlocked = true;
          await provider.save();

          // Immediately send email notification to provider
          await sendSuspensionEmail(
            provider.email,
            provider.name || provider.email.split('@')[0],
            adminNote || inquiry.adminNote
          );
        } else {
          await provider.save();
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: `Inquiry ${inquiry.status.toLowerCase()} successfully`,
      data: inquiry,
      autoBlocked,
      consecutiveRejections: provider?.consecutiveRejections || 0,
      isBlocked: provider?.isBlocked || false,
      blockedUntil: provider?.blockedUntil || null,
    });
  } catch (error) {
    console.error('reviewInquiry Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to review inquiry', error: error.message });
  }
};

/**
 * 5. GET /api/inquiries/penalty-registry
 * Fetch penalty point registry list for Admin Web App
 */
exports.getPenaltyRegistry = async (req, res) => {
  try {
    const providers = await Provider.find({ role: 'ServiceProvider' }).select('-password');
    const allInquiries = await Inquiry.find({});

    let coordinationBookings = [];
    if (coordinationDb && coordinationDb.readyState === 1) {
      try {
        const bookingsColl = coordinationDb.collection('bookings');
        coordinationBookings = await bookingsColl.find({
          bookingStatus: {
            $in: ['CANCELLED', 'CONFIRMED', 'DELAY_REPORTED', 'IN_PROGRESS', 'RESCHEDULING_REQUIRED', 'RESCHEDULED'],
          },
          'cancellationInfo.cancelledBy': { $ne: 'SEEKER' },
          cancelledBy: { $ne: 'SEEKER' },
          cancelledBySeeker: { $ne: true },
        }).toArray();
      } catch (dbErr) {
        console.log('Error fetching coordination bookings for registry:', dbErr.message);
      }
    }

    const registry = providers.map((p) => {
      // Find inquiries for this provider
      const providerInquiries = allInquiries.filter(
        (inq) => inq.providerId.toString() === p._id.toString()
      );
      const latestInquiry = providerInquiries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

      // Approved booking ids
      const approvedIds = new Set();
      providerInquiries.forEach(inq => {
        if (inq.status === 'Approved') {
          inq.missedServices.forEach(s => approvedIds.add(s.bookingId));
        }
      });

      // Find real dynamic cancellations & 24h auto-expired bookings for this provider
      const providerBookings = coordinationBookings.filter(
        (b) => b.providerId && b.providerId.toString() === p._id.toString()
      );

      const dynamicMissedList = providerBookings.filter(b => {
        if (approvedIds.has(b._id.toString())) return false;
        if (b.bookingStatus === 'CANCELLED') return true;

        // Check if 24 hours overdue past duration
        try {
          if (!b.scheduledDate) return false;
          let dateTimeStr = b.scheduledDate;
          if (b.startTime) dateTimeStr += ' ' + b.startTime;
          else dateTimeStr += ' 00:00';
          const startTimeMs = new Date(dateTimeStr).getTime();
          if (isNaN(startTimeMs)) {
            if (b.createdAt) {
              return (Date.now() - new Date(b.createdAt).getTime()) > (24 * 60 * 60 * 1000);
            }
            return false;
          }
          const durationHours = b.estimatedDurationHours || 1;
          const deadlineMs = startTimeMs + (durationHours * 60 * 60 * 1000) + (24 * 60 * 60 * 1000);
          return Date.now() >= deadlineMs;
        } catch (e) {
          return false;
        }
      });

      // Determine raw consecutive cancellations
      let rawCancels = dynamicMissedList.length;
      if (rawCancels === 0) {
        if (latestInquiry && latestInquiry.status !== 'Approved') {
          if (latestInquiry.missedServices && latestInquiry.missedServices.length > 0) {
            rawCancels = latestInquiry.missedServices.length;
          } else if (latestInquiry.status === 'Rejected' || latestInquiry.status === 'Submitted') {
            rawCancels = 2;
          }
        } else if (p.consecutiveRejections) {
          rawCancels = p.consecutiveRejections + 1;
        }
      }

      // Convert consecutive cancellations to Penalty Score (Rule: 2 cancels -> 1/3, 3 cancels -> 2/3, >=4 -> 3/3, 0/1 -> 0/3)
      let penaltyScore = 0;
      if (p.isBlocked || (p.consecutiveRejections && p.consecutiveRejections >= 3)) {
        penaltyScore = 3;
      } else if (rawCancels >= 4) {
        penaltyScore = 3;
      } else if (rawCancels === 3) {
        penaltyScore = 2;
      } else if (rawCancels === 2) {
        penaltyScore = 1;
      } else {
        penaltyScore = 0; // 0 or 1 cancellation -> 0/3
      }

      // Inquiry status rule: Required for 3/3 (mandatory to unblock/reinstate), Optional for 2/3, Not Required for 0/3 & 1/3
      let inquiryStatus = 'Not Required';
      if (penaltyScore >= 3) {
        inquiryStatus = 'Required';
      } else if (penaltyScore === 2) {
        inquiryStatus = 'Optional';
      } else {
        inquiryStatus = 'Not Required';
      }

      // Check status string
      let status = 'Active';
      if (p.isBlocked) {
        status = p.blockedUntil ? 'Suspended' : 'Blocked';
      }

      const missedServicesDisplay = dynamicMissedList.length > 0
        ? dynamicMissedList.map(b => ({
            id: b._id.toString(),
            date: b.scheduledDate || (b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : ''),
            time: b.startTime ? `${b.startTime} - ${b.endTime || ''}` : '',
            location: b.location?.address || b.location?.city || p.district || 'Colombo',
            reason: b.bookingStatus === 'CANCELLED' 
              ? (b.cancellationReason || 'Cancelled by provider')
              : (b.bookingStatus === 'RESCHEDULED' 
                  ? 'Rescheduled service not attended (Auto-cancelled after 24h)' 
                  : `Service uncompleted after 24h past duration (${b.bookingStatus})`)
          }))
        : (latestInquiry?.missedServices || []);

      return {
        id: p._id,
        name: p.name || p.email.split('@')[0],
        role: p.category ? `${p.category} Specialist` : 'Service Provider',
        rawCancels,
        penaltyCount: penaltyScore,
        maxPenalty: 3,
        penaltyRatio: `${penaltyScore}/3`,
        score: Math.round((penaltyScore / 3) * 100),
        status,
        systemAction: p.isBlocked ? 'locked' : 'unlocked',
        inquiryStatus,
        consecutiveRejections: p.consecutiveRejections || 0,
        blockedUntil: p.blockedUntil,
        missedServices: missedServicesDisplay,
      };
    });

    // Active inquiries = count of providers where inquiryStatus is Required
    const activeInquiries = registry.filter((r) => r.inquiryStatus === 'Required').length;
    const blockedAccounts = providers.filter((p) => p.isBlocked).length;

    return res.status(200).json({
      success: true,
      stats: {
        activeInquiries,
        blockedAccounts,
      },
      data: registry,
    });
  } catch (error) {
    console.error('getPenaltyRegistry Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch penalty registry', error: error.message });
  }
};

/**
 * 6. PUT /api/inquiries/provider/:id/toggle-lock
 * Admin manually locks or unlocks a provider account anytime
 */
exports.toggleProviderLock = async (req, res) => {
  try {
    const { id } = req.params;
    const provider = await Provider.findById(id);

    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    provider.isBlocked = !provider.isBlocked;
    if (!provider.isBlocked) {
      provider.blockedUntil = null;
      provider.consecutiveRejections = 0;
      provider.blockReason = '';
      provider.lastUnblockedAt = new Date();
    } else {
      provider.blockReason = 'Manually locked by administrator';
    }

    await provider.save();

    return res.status(200).json({
      success: true,
      message: `Provider successfully ${provider.isBlocked ? 'locked' : 'unlocked'}`,
      isBlocked: provider.isBlocked,
      systemAction: provider.isBlocked ? 'locked' : 'unlocked',
    });
  } catch (error) {
    console.error('toggleProviderLock Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to toggle lock', error: error.message });
  }
};
