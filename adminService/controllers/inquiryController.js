const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const Inquiry = require('../models/Inquiry');
const Provider = require('../models/Provider');
const ProviderNotification = require('../models/ProviderNotification');

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

// Helper to send suspension email including upcoming bookings on suspension
async function sendSuspensionEmail(provider, adminNote) {
  let upcomingBookings = [];

  if (coordinationDb && coordinationDb.readyState === 1) {
    try {
      const bookingsColl = coordinationDb.collection('bookings');
      const postsColl = coordinationDb.collection('posts');

      // Find all active/upcoming bookings that are NOT CANCELLED (bookingStatus != CANCELLED)
      const activeBookings = await bookingsColl.find({
        providerId: new mongoose.Types.ObjectId(provider._id),
        bookingStatus: { $ne: 'CANCELLED' }
      }).sort({ scheduledDate: 1, startTime: 1 }).toArray();

      for (const b of activeBookings) {
        let postTitle = 'Service Appointment';
        let postCategory = '';
        let seekerAddress = b.location?.address || b.location?.city || '';

        if (b.postId && mongoose.Types.ObjectId.isValid(b.postId)) {
          const post = await postsColl.findOne({ _id: new mongoose.Types.ObjectId(b.postId) });
          if (post) {
            postTitle = post.title || postTitle;
            postCategory = post.category || '';
            if (!seekerAddress && post.location?.address) {
              seekerAddress = post.location.address;
            }
          }
        }

        upcomingBookings.push({
          bookingId: b._id.toString(),
          date: b.scheduledDate || 'Upcoming',
          time: b.startTime ? `${b.startTime} - ${b.endTime || ''}` : 'Scheduled Time',
          location: seekerAddress || provider.district || 'Client Location',
          title: postTitle,
          category: postCategory,
          status: b.bookingStatus,
        });
      }
    } catch (dbErr) {
      console.log('[Email] Error fetching upcoming bookings for email:', dbErr.message);
    }
  }

  // Generate HTML table for upcoming bookings
  let bookingsHtml = '';
  if (upcomingBookings.length > 0) {
    bookingsHtml = `
      <div style="margin-top: 20px; background-color: #fffbeb; border: 1.5px solid #fde68a; border-radius: 10px; padding: 18px;">
        <h3 style="color: #b45309; margin-top: 0;">
          ⚠️ CRITICAL: YOU MUST FULFILL YOUR UPCOMING COMMITTED JOBS (${upcomingBookings.length})
        </h3>
        <p style="color: #92400e; font-size: 13.5px; line-height: 1.5; margin-bottom: 14px;">
          Even though your account is currently <strong>SUSPENDED</strong> from accepting new bookings, <strong>you must honor and complete all previously confirmed client appointments listed below</strong> as agreed. Failure to attend these jobs will result in permanent account termination.
        </p>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
          <thead>
            <tr style="background-color: #f3f4f6; text-align: left; color: #374151;">
              <th style="padding: 10px; border-bottom: 1px solid #e5e7eb;">Date & Time</th>
              <th style="padding: 10px; border-bottom: 1px solid #e5e7eb;">Service Details</th>
              <th style="padding: 10px; border-bottom: 1px solid #e5e7eb;">Location</th>
              <th style="padding: 10px; border-bottom: 1px solid #e5e7eb;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${upcomingBookings.map((b) => `
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px; font-weight: 600; color: #111827;">
                  📅 ${b.date}<br/><span style="font-size: 11.5px; color: #6b7280;">⏰ ${b.time}</span>
                </td>
                <td style="padding: 10px; color: #1f2937;">
                  <strong>${b.title}</strong>
                  ${b.category ? `<br/><span style="font-size: 11.5px; color: #4f46e5;">${b.category}</span>` : ''}
                  <br/><span style="font-size: 10px; color: #9ca3af;">ID: ${b.bookingId}</span>
                </td>
                <td style="padding: 10px; color: #4b5563;">
                  📍 ${b.location}
                </td>
                <td style="padding: 10px;">
                  <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; background-color: #dbeafe; color: #1e40af;">
                    ${b.status}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    bookingsHtml = `
      <div style="margin-top: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; color: #64748b; font-size: 13px;">
        ℹ️ You currently have no pending upcoming confirmed bookings in the system.
      </div>
    `;
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Work Wave <noreply@workwave.com>',
    to: provider.email,
    subject: '⚠️ Account Suspended Notice & Upcoming Bookings Schedule - Work Wave',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px; color: #333; border: 1px solid #fee2e2; border-radius: 12px; background-color: #ffffff;">
        <div style="border-bottom: 2px solid #ef4444; padding-bottom: 12px; margin-bottom: 18px;">
          <h2 style="color: #ef4444; margin: 0;">⚠️ Account Suspended Notice (30 Days)</h2>
          <span style="font-size: 12px; color: #6b7280;">Work Wave Governance & Trust Enforcement</span>
        </div>

        <p>Dear <strong>${provider.name || provider.email.split('@')[0]}</strong>,</p>
        <p>Your recent service cancellation inquiries (3 distinct missed service inquiries) have been <strong>REJECTED</strong> by the Administration due to invalid or insufficient justifications.</p>
        
        <div style="background-color: #fee2e2; padding: 14px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ef4444;">
          <strong>Admin Rejection Feedback:</strong><br/>
          <span style="color: #991b1b;">${adminNote || 'No acceptable proof or valid emergency evidence was provided.'}</span>
        </div>

        <h3 style="color: #b91c1c; margin-bottom: 8px;">Suspension Terms:</h3>
        <ul style="padding-left: 20px; line-height: 1.6; color: #374151;">
          <li>Your account has been <strong>suspended for 1 Month (30 Days)</strong> until <strong>${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</strong>.</li>
          <li>You are logged out and restricted from accepting new service requests or submitting proposals.</li>
        </ul>

        ${bookingsHtml}

        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px dashed #cbd5e1;">
          <h4 style="margin-top: 0; color: #111827;">Pardon Policy & How to Appeal:</h4>
          <p style="margin-bottom: 8px; font-size: 13px; color: #4b5563;">
            Once the 30-day suspension period concludes (or if the Administrator grants an early pardon and unblocks you), your account will receive a <strong>clean slate with a 0 rejection count</strong>. Only 3 new consecutive rejections from that point onwards will trigger suspension.
          </p>
          <p style="margin-bottom: 8px; font-size: 13px; color: #4b5563;">To appeal with valid official documents, please contact:</p>
          <p style="font-size: 15px; font-weight: bold; color: #4f46e5; margin: 8px 0;">
            📧 nethmiumaya5@gmail.com
          </p>
        </div>

        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
          Work Wave Platform Governance System • Automated Security Dispatch
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Suspension & upcoming bookings email sent to ${provider.email}:`, info.messageId);
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

    // 1. Get inquiries submitted by this provider
    const existingInquiries = await Inquiry.find({ providerId }).sort({ createdAt: -1 });
    
    // Map of bookingId -> latest inquiry
    const bookingInquiryMap = {};
    existingInquiries.forEach((inq) => {
      if (inq.bookingId && !bookingInquiryMap[inq.bookingId]) {
        bookingInquiryMap[inq.bookingId] = inq;
      }
      (inq.missedServices || []).forEach((s) => {
        if (s.bookingId && !bookingInquiryMap[s.bookingId]) {
          bookingInquiryMap[s.bookingId] = inq;
        }
      });
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

            const inq = bookingInquiryMap[b._id.toString()];
            let inqStatus = 'NOT_SUBMITTED';
            let inqId = null;
            let inqReason = '';
            let inqSubmittedAt = null;

            if (inq) {
              inqId = inq._id;
              inqReason = inq.reason;
              inqSubmittedAt = inq.createdAt;
              if (inq.status === 'Approved') inqStatus = 'APPROVED';
              else if (inq.status === 'Submitted' || inq.status === 'Pending') inqStatus = 'PENDING';
              else if (inq.status === 'ReSubmited' || inq.status === 'ReSubmitted' || inq.status === 'Re-submitted') inqStatus = 'RESUBMITTED';
              else if (inq.status === 'Rejected') inqStatus = 'REJECTED';
            }

            return {
              bookingId: b._id.toString(),
              date: b.scheduledDate || (b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : '2024-05-01'),
              time: b.startTime ? `${b.startTime} - ${b.endTime || ''}` : '10:00 AM',
              location: b.location?.address || b.location?.city || 'Colombo',
              reason,
              cancelledBy: b.cancellationInfo?.cancelledBy || b.cancelledBy || 'PROVIDER',
              status: b.bookingStatus,
              isAutoExpired,
              inquiryStatus: inqStatus,
              inquiryId: inqId,
              inquiryReason: inqReason,
              inquirySubmittedAt: inqSubmittedAt,
              canSubmitInquiry: inqStatus !== 'APPROVED' && inqStatus !== 'PENDING' && inqStatus !== 'RESUBMITTED',
            };
          });
      } catch (dbErr) {
        console.log('Error querying coordination bookings:', dbErr.message);
      }
    }

    // Filter out APPROVED bookings (Rule: "Admin Approve කළ Inquiries ❌ Cleared (ලැයිස්තුවෙන් ඉවත් වේ)")
    const activeMissedBookings = rawMissedBookings.filter((b) => b.inquiryStatus !== 'APPROVED');

    const penaltyScore = activeMissedBookings.length;
    const penaltyRatio = `${penaltyScore}/3`;
    const inquiryStatus = penaltyScore >= 3 ? 'Required' : (penaltyScore === 2 ? 'Optional' : 'Not Required');
    const isRestricted = penaltyScore >= 3 || provider.isBlocked;

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
      missedBookings: activeMissedBookings,
      penaltyScore,
      penaltyRatio,
      inquiryStatus,
      isRestricted,
      restrictionMessage: isRestricted
        ? (provider.isBlocked 
            ? `Your account is suspended until ${provider.blockedUntil ? new Date(provider.blockedUntil).toLocaleDateString() : 'Admin unblocks'}. Appeal by emailing nethmiumaya5@gmail.com.`
            : 'Your account is restricted due to 3 or more unapproved service cancellations. Please submit inquiries for missed bookings.')
        : null,
    });
  } catch (error) {
    console.error('getProviderMissedBookings Error:', error.message);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

/**
 * 2. POST /api/inquiries
 * Submit an inquiry for a single missed booking (or batch) from Provider App
 */
exports.submitInquiry = async (req, res) => {
  try {
    const {
      providerId,
      bookingId,
      bookingDetails,
      providerName,
      providerEmail,
      providerAvatar,
      providerRole,
      reason,
      missedServices,
      evidenceImages,
    } = req.body;

    if (!providerId || !reason) {
      return res.status(400).json({ success: false, message: 'providerId and reason are required' });
    }

    const provider = await Provider.findById(providerId);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    // Determine target bookingId
    let targetBookingId = bookingId || '';
    let parsedBookingDetails = null;

    if (typeof bookingDetails === 'string') {
      try { parsedBookingDetails = JSON.parse(bookingDetails); } catch(e) { parsedBookingDetails = null; }
    } else if (bookingDetails && typeof bookingDetails === 'object') {
      parsedBookingDetails = bookingDetails;
    }

    if (!targetBookingId && parsedBookingDetails?.bookingId) {
      targetBookingId = parsedBookingDetails.bookingId;
    }

    let parsedMissedServices = [];
    if (typeof missedServices === 'string') {
      try { parsedMissedServices = JSON.parse(missedServices); } catch(e) { parsedMissedServices = []; }
    } else if (Array.isArray(missedServices)) {
      parsedMissedServices = missedServices;
    }

    if (!targetBookingId && parsedMissedServices.length > 0) {
      targetBookingId = parsedMissedServices[0].bookingId || parsedMissedServices[0].id || '';
    }

    // Check if this specific booking already has an active pending or resubmitted inquiry
    if (targetBookingId) {
      const existingPending = await Inquiry.findOne({
        providerId: provider._id,
        $or: [
          { bookingId: targetBookingId },
          { 'missedServices.bookingId': targetBookingId },
        ],
        status: { $in: ['Submitted', 'Pending', 'ReSubmited', 'ReSubmitted', 'Re-submitted'] },
      });

      if (existingPending) {
        return res.status(400).json({
          success: false,
          message: 'An inquiry for this specific booking is already submitted and pending Admin review (Working days 1-3).',
        });
      }
    }

    // Check if this is a Re-Submission following a previous rejection
    let isResubmission =
      req.body.isResubmission === true ||
      req.body.isResubmission === 'true' ||
      req.body.isResubmit === true ||
      req.body.isResubmit === 'true';

    if (!isResubmission && targetBookingId) {
      const previousRejected = await Inquiry.findOne({
        providerId: provider._id,
        $or: [
          { bookingId: targetBookingId },
          { 'missedServices.bookingId': targetBookingId },
        ],
        status: 'Rejected',
      });
      if (previousRejected) {
        isResubmission = true;
      }
    }

    const assignedStatus = isResubmission ? 'ReSubmited' : 'Submitted';

    // Collect uploaded file URLs if uploaded via multer
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(f => `/uploads/${f.filename}`);
    } else if (evidenceImages) {
      images = Array.isArray(evidenceImages) ? evidenceImages : [evidenceImages];
    }

    const itemDetails = parsedBookingDetails || (parsedMissedServices.length > 0 ? parsedMissedServices[0] : null) || {
      bookingId: targetBookingId || 'MS-1',
      date: new Date().toISOString().split('T')[0],
      time: '10:00 AM',
      location: provider.district || 'Colombo',
      reason: 'Cancelled by provider',
    };

    const sanitizedMissedServices = [
      {
        bookingId: itemDetails.bookingId || targetBookingId || 'MS-1',
        date: itemDetails.date || new Date().toISOString().split('T')[0],
        time: itemDetails.time || '10:00 AM',
        location: itemDetails.location || provider.district || 'Colombo',
        reason: itemDetails.reason || itemDetails.cancellationReason || 'Cancelled by provider',
        status: assignedStatus,
        adminNote: '',
      }
    ];

    const newInquiry = new Inquiry({
      providerId: provider._id,
      providerName: providerName || provider.name || provider.email.split('@')[0],
      providerEmail: providerEmail || provider.email,
      providerAvatar: providerAvatar || provider.profileImage || '',
      providerRole: providerRole || provider.category || 'Service Provider',
      bookingId: targetBookingId || sanitizedMissedServices[0].bookingId,
      bookingDetails: itemDetails,
      missedServices: sanitizedMissedServices,
      reason: reason.trim(),
      evidenceImages: images,
      status: assignedStatus,
    });

    await newInquiry.save();

    // Update coordinationDb booking if available
    if (coordinationDb && coordinationDb.readyState === 1 && targetBookingId && mongoose.Types.ObjectId.isValid(targetBookingId)) {
      try {
        await coordinationDb.collection('bookings').updateOne(
          { _id: new mongoose.Types.ObjectId(targetBookingId) },
          { $set: { 'cancellationInfo.inquiryStatus': assignedStatus.toUpperCase(), 'cancellationInfo.inquiryId': newInquiry._id } }
        );
      } catch (cErr) {
        console.log('Error updating coordination booking status on submit:', cErr.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: isResubmission 
        ? 'Inquiry re-submitted successfully with status ReSubmited and is pending admin review.'
        : 'Inquiry submitted successfully for this booking and is pending admin review.',
      inquiryId: newInquiry._id,
      status: assignedStatus,
      isResubmission,
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

        // Dispatch in-app system notification for approval
        try {
          const dateStr = inquiry.bookingDetails?.date || (inquiry.missedServices && inquiry.missedServices[0]?.date) || 'Recent Missed Service';
          const approvalNotice = new ProviderNotification({
            providerId: provider._id,
            title: 'Inquiry Approved — Penalty Cleared',
            message: `Your inquiry for service on ${dateStr} has been APPROVED by Administration. The penalty score for this missed booking has been cleared.`,
            type: 'inquiry_approved',
            bookingId: inquiry.bookingId || (inquiry.missedServices && inquiry.missedServices[0]?.bookingId),
            isRead: false,
          });
          await approvalNotice.save();
        } catch (aNotifErr) {
          console.log('Error creating provider notification on approval:', aNotifErr.message);
        }
      } else if (isAllRejected) {
        // Find all reviewed inquiries for this provider ordered by reviewedAt ascending
        const allProviderInquiries = await Inquiry.find({
          providerId: provider._id,
          status: { $in: ['Approved', 'Rejected'] },
        }).sort({ reviewedAt: 1, createdAt: 1 });

        // Calculate consecutive rejected DISTINCT bookings since the last approval
        let distinctRejectedBookingIds = new Set();

        for (const inq of allProviderInquiries) {
          if (provider.lastUnblockedAt && new Date(inq.reviewedAt || inq.updatedAt) < new Date(provider.lastUnblockedAt)) {
            continue;
          }

          if (inq.status === 'Approved') {
            // Approval resets the consecutive streak
            distinctRejectedBookingIds.clear();
          } else if (inq.status === 'Rejected') {
            const bId = inq.bookingId || (inq.missedServices && inq.missedServices[0]?.bookingId);
            if (bId) {
              distinctRejectedBookingIds.add(bId.toString());
            } else {
              distinctRejectedBookingIds.add(inq._id.toString());
            }
          }
        }

        const distinctCount = distinctRejectedBookingIds.size;
        provider.consecutiveRejections = distinctCount;

        // Send in-app system notification to provider allowing re-submission
        try {
          const dateStr = inquiry.bookingDetails?.date || (inquiry.missedServices && inquiry.missedServices[0]?.date) || 'Recent Missed Service';
          const rejectionNotice = new ProviderNotification({
            providerId: provider._id,
            title: 'Inquiry Rejected — Re-submission Allowed',
            message: `Your inquiry for service on ${dateStr} was rejected by Admin (Reason: "${adminNote || inquiry.adminNote || 'Insufficient proof'}"). You can re-submit an updated inquiry with more evidence.`,
            type: 'inquiry_rejected',
            bookingId: inquiry.bookingId || (inquiry.missedServices && inquiry.missedServices[0]?.bookingId),
            isRead: false,
          });
          await rejectionNotice.save();
        } catch (notifErr) {
          console.log('Error creating provider notification on reject:', notifErr.message);
        }

        if (distinctCount >= 3) {
          // Automatic 1 Month (30 Days) Block when 3 DISTINCT missed booking inquiries are rejected
          const oneMonthLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          provider.isBlocked = true;
          provider.blockedUntil = oneMonthLater;
          provider.blockReason = '3 distinct missed service inquiries rejected consecutively';
          autoBlocked = true;
          await provider.save();

          // Also save suspension in-app notification
          try {
            const blockNotice = new ProviderNotification({
              providerId: provider._id,
              title: 'Account Suspended (30 Days)',
              message: 'Your account has been automatically suspended for 30 days due to 3 distinct missed service inquiry rejections. Access is restricted until ' + oneMonthLater.toLocaleDateString() + '.',
              type: 'account_suspended',
              isRead: false,
            });
            await blockNotice.save();
          } catch (bNotifErr) {
            console.log('Error creating suspension notification:', bNotifErr.message);
          }

          // Immediately send email notification to provider with full upcoming bookings schedule
          await sendSuspensionEmail(
            provider,
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
 * Helper: Automatically dispatch penalty warning notification to provider
 * when penalty score is 3/3 or higher.
 */
const dispatchPenaltyWarningNotification = async (providerId, penaltyCount, penaltyRatio, providerName) => {
  try {
    if (penaltyCount < 3) return;
    const pIdStr = String(providerId);

    // Prevent duplicate notification within 6 hours for the same provider
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const existing = await ProviderNotification.findOne({
      providerId: pIdStr,
      type: 'PENALTY_WARNING',
      createdAt: { $gte: sixHoursAgo },
    });

    if (existing) {
      return;
    }

    const title = `⚠️ Critical Penalty Alert (${penaltyRatio} Points)`;
    const message = `Your penalty score has reached ${penaltyRatio} due to missed or cancelled bookings. Please submit an inquiry for your missed or cancelled bookings immediately. Until your penalty points are reduced below 3, posting new services and receiving new bookings from seekers will be restricted.`;

    // 1. Direct insert into adminService ProviderNotification (FinanceManagement DB)
    await ProviderNotification.create({
      providerId: pIdStr,
      title,
      message,
      type: 'PENALTY_WARNING',
      isRead: false,
      createdAt: new Date(),
    });

    // 2. Direct insert into Provider_Service DB (for ServiceProvider Mobile App)
    try {
      const providerMongoUri = process.env.PROVIDER_MONGO_URI || 
        'mongodb+srv://jkumarasekara_db_user:vfDFrozTabkpXDCl@cluster0.xggs3th.mongodb.net/Provider_Service?retryWrites=true&w=majority';
      const providerConn = await mongoose.createConnection(providerMongoUri).asPromise();
      const notifColl = providerConn.collection('providernotifications');
      await notifColl.insertOne({
        providerId: pIdStr,
        title,
        message,
        type: 'PENALTY_WARNING',
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await providerConn.close();
    } catch (dbErr) {
      console.warn('Provider_Service DB penalty notification write note:', dbErr.message);
    }

    // 3. Dispatch real-time Socket notification via authService
    try {
      await fetch('http://localhost:4003/admin/notify-provider-internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: pIdStr,
          title,
          message,
          type: 'PENALTY_WARNING',
        }),
      });
    } catch (sockErr) {
      console.log('Socket dispatch penalty warning note:', sockErr.message);
    }
  } catch (err) {
    console.error('Error dispatching penalty warning notification:', err.message);
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

      // Determine raw active cancellations
      const activeMissedCount = dynamicMissedList.length;
      const penaltyCount = activeMissedCount;
      const penaltyRatio = `${penaltyCount}/3`;

      // Dispatch system notification if penalty score is 3/3 or higher
      if (penaltyCount >= 3) {
        dispatchPenaltyWarningNotification(p._id, penaltyCount, penaltyRatio, p.name || p.email).catch(e => {
          console.warn('Penalty warning dispatch background note:', e.message);
        });
      }

      // Inquiry status rule: Required for >= 3/3, Optional for 2/3, Not Required for <= 1/3
      let inquiryStatus = 'Not Required';
      if (penaltyCount >= 3 || p.isBlocked) {
        inquiryStatus = 'Required';
      } else if (penaltyCount === 2) {
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
        rawCancels: penaltyCount,
        penaltyCount: penaltyCount,
        maxPenalty: 3,
        penaltyRatio: penaltyRatio,
        score: Math.round((penaltyCount / 3) * 100),
        status,
        systemAction: p.isBlocked ? 'locked' : 'unlocked',
        inquiryStatus,
        consecutiveRejections: p.consecutiveRejections || 0,
        blockedUntil: p.blockedUntil,
        isDanger: penaltyCount >= 3 || p.isBlocked,
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
 * Explicitly sends a penalty warning notification on demand
 * POST /api/inquiries/send-penalty-warning/:providerId
 */
exports.sendPenaltyWarning = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { penaltyCount, penaltyRatio } = req.body || {};

    const provider = await Provider.findById(providerId);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    const ratio = penaltyRatio || `${penaltyCount || 2}/3`;
    const title = `⚠️ Critical Penalty Alert (${ratio} Points)`;
    const message = `Your penalty score has reached ${ratio} due to missed or cancelled bookings. Please submit an inquiry for your missed or cancelled bookings immediately. Until your penalty points are reduced below 3, posting new services and receiving new bookings from seekers will be restricted.`;

    await ProviderNotification.create({
      providerId: String(providerId),
      title,
      message,
      type: 'PENALTY_WARNING',
      isRead: false,
      createdAt: new Date(),
    });

    try {
      const providerMongoUri = process.env.PROVIDER_MONGO_URI || 
        'mongodb+srv://jkumarasekara_db_user:vfDFrozTabkpXDCl@cluster0.xggs3th.mongodb.net/Provider_Service?retryWrites=true&w=majority';
      const providerConn = await mongoose.createConnection(providerMongoUri).asPromise();
      const notifColl = providerConn.collection('providernotifications');
      await notifColl.insertOne({
        providerId: String(providerId),
        title,
        message,
        type: 'PENALTY_WARNING',
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await providerConn.close();
    } catch (dbErr) {
      console.warn('Provider_Service DB penalty notification write note:', dbErr.message);
    }

    try {
      await fetch('http://localhost:4003/admin/notify-provider-internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: String(providerId),
          title,
          message,
          type: 'PENALTY_WARNING',
        }),
      });
    } catch (sockErr) {
      console.log('Socket dispatch penalty warning note:', sockErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Penalty warning notification successfully sent to provider ${provider.name || provider.email}`,
    });
  } catch (err) {
    console.error('sendPenaltyWarning Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to send penalty warning', error: err.message });
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
      await provider.save();
    } else {
      provider.blockReason = 'Manually locked by administrator';
      await provider.save();
      // Send suspension email with full upcoming jobs schedule
      await sendSuspensionEmail(provider, 'Account locked by Administrator');
    }

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

/**
 * 7. GET /api/inquiries/provider-status/:providerId
 * Check provider block and suspension status for mobile app session validation
 */
exports.getProviderStatus = async (req, res) => {
  try {
    const { providerId } = req.params;
    if (!providerId || !mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({ success: false, message: 'Invalid provider ID' });
    }

    const provider = await Provider.findById(providerId).select('-password');
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    // Auto-unblock if 30 days expired
    if (provider.isBlocked && provider.blockedUntil && new Date() >= new Date(provider.blockedUntil)) {
      provider.isBlocked = false;
      provider.blockedUntil = null;
      provider.consecutiveRejections = 0;
      provider.blockReason = '';
      provider.lastUnblockedAt = new Date();
      await provider.save();
    }

    // Count active unapproved missed/cancelled services from coordinationDb
    let activeMissedCount = 0;
    if (coordinationDb && coordinationDb.readyState === 1) {
      try {
        const bookingsColl = coordinationDb.collection('bookings');
        activeMissedCount = await bookingsColl.countDocuments({
          providerId: new mongoose.Types.ObjectId(providerId),
          bookingStatus: 'CANCELLED',
          'cancellationInfo.cancelledBy': 'PROVIDER',
          'cancellationInfo.inquiryStatus': { $ne: 'APPROVED' },
        });
      } catch (cErr) {
        console.log('Error counting missed bookings for provider status:', cErr.message);
      }
    }

    const isRestricted = provider.isBlocked || activeMissedCount >= 3;
    const isBookable = !isRestricted;
    const canSendProposals = !isRestricted;
    const canAcceptBooking = !isRestricted;

    let restrictionReason = '';
    if (provider.isBlocked) {
      restrictionReason = provider.blockReason || 'Account suspended by Administrator (30 Days lockout)';
    } else if (activeMissedCount >= 3) {
      restrictionReason = `Penalty limit reached: ${activeMissedCount} active missed/cancelled services (${activeMissedCount}/3). Booking & proposals restricted until inquiries are reviewed and approved.`;
    }

    return res.status(200).json({
      success: true,
      providerId: provider._id,
      name: provider.name,
      email: provider.email,
      // Standardized Boolean Flags for Seeker & Coordination integration:
      isBookable,
      canSendProposals,
      canAcceptBooking,
      isRestricted,
      restrictionReason,
      activeMissedBookingsCount: activeMissedCount,
      penaltyScore: activeMissedCount,
      penaltyRatio: `${activeMissedCount}/3`,
      isBlocked: provider.isBlocked || false,
      blockedUntil: provider.blockedUntil || null,
      blockReason: provider.blockReason || '',
      consecutiveRejections: provider.consecutiveRejections || 0,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 8. GET /api/inquiries/check-bookable/:providerId
 * Dedicated lightweight endpoint for Seeker Service / Coordination Service to check if provider can be booked
 */
exports.checkProviderBookable = async (req, res) => {
  return exports.getProviderStatus(req, res);
};

/**
 * 8. GET /api/inquiries/notifications/:providerId
 * Fetch in-app notifications for provider
 */
exports.getProviderNotifications = async (req, res) => {
  try {
    const { providerId } = req.params;
    if (!providerId || !mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({ success: false, message: 'Invalid provider ID' });
    }

    const notifs = await ProviderNotification.find({ providerId }).sort({ createdAt: -1 }).limit(30);
    return res.status(200).json({
      success: true,
      count: notifs.length,
      data: notifs,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCoordinationDb = () => coordinationDb;


