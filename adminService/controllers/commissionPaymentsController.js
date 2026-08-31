const mongoose = require('mongoose');

/**
 * Helper to get DB connections
 */
const getProviderDbConn = async () => {
  const providerMongoUri = process.env.PROVIDER_MONGO_URI || 
    'mongodb+srv://jkumarasekara_db_user:vfDFrozTabkpXDCl@cluster0.xggs3th.mongodb.net/Provider_Service?retryWrites=true&w=majority';
  return mongoose.createConnection(providerMongoUri).asPromise();
};

const getCoordinationDbConn = async () => {
  const coordMongoUri = process.env.COORDINATION_MONGO_URI || 
    'mongodb+srv://Chaveenn:Cwij7035@rp-r26-se-020.ce8egup.mongodb.net/PP1?appName=RP-R26-SE-020';
  return mongoose.createConnection(coordMongoUri).asPromise();
};

/**
 * GET /api/monthly-commission-payments
 * Fetches all provider monthly 5% commission billing records with provider profiles, payment status, and summary metrics.
 */
exports.getMonthlyCommissionPayments = async (req, res) => {
  let providerConn = null;
  try {
    const { month, status, district, search } = req.query;

    providerConn = await getProviderDbConn();
    const billingColl = providerConn.collection('commissionbillings');
    const providerColl = providerConn.collection('providers');

    // 1. Fetch Provider Profile Map (from FinanceManagement or Provider_Service)
    const providerMap = {};
    try {
      // First check local Admin FinanceManagement providers
      if (mongoose.connection && mongoose.connection.db) {
        const adminProviders = await mongoose.connection.db.collection('providers').find({}).toArray();
        adminProviders.forEach(p => {
          if (p._id) {
            providerMap[p._id.toString()] = {
              id: p._id.toString(),
              fullName: p.fullName || p.name || 'Service Provider',
              email: p.email || 'N/A',
              phone: p.phone || p.contactNumber || p.phoneNumber || 'N/A',
              district: p.district || 'Colombo',
              city: p.city || '',
              category: p.category || p.serviceType || (p.skills && p.skills[0]) || 'General Service',
              avatar: p.profilePicture || p.avatar || '',
            };
          }
        });
      }

      // Supplement / fallback with Provider_Service providers
      const provServiceProviders = await providerColl.find({}).toArray();
      provServiceProviders.forEach(p => {
        const pid = p._id ? p._id.toString() : '';
        if (pid && !providerMap[pid]) {
          providerMap[pid] = {
            id: pid,
            fullName: p.fullName || p.name || 'Service Provider',
            email: p.email || 'N/A',
            phone: p.phone || p.contactNumber || p.phoneNumber || 'N/A',
            district: p.district || 'Colombo',
            city: p.city || '',
            category: p.category || p.serviceType || (p.skills && p.skills[0]) || 'General Service',
            avatar: p.profilePicture || p.avatar || '',
          };
        } else if (pid && providerMap[pid]) {
          if (!providerMap[pid].phone || providerMap[pid].phone === 'N/A') {
            providerMap[pid].phone = p.phone || p.contactNumber || p.phoneNumber || 'N/A';
          }
          if (!providerMap[pid].category || providerMap[pid].category === 'General Service') {
            providerMap[pid].category = p.category || p.serviceType || (p.skills && p.skills[0]) || 'General Service';
          }
        }
      });
    } catch (pErr) {
      console.warn('Error loading provider profiles:', pErr.message);
    }

    // 2. Fetch all Commission Billings
    const allBills = await billingColl.find({}).sort({ billingMonth: -1, createdAt: -1 }).toArray();

    // 3. Transform and Enrich Billing Records
    const now = new Date();
    const enrichedList = allBills.map(bill => {
      const pIdStr = bill.providerId ? bill.providerId.toString() : '';
      const providerProfile = providerMap[pIdStr] || {
        id: pIdStr,
        fullName: 'Service Provider',
        email: 'N/A',
        phone: 'N/A',
        district: 'Colombo',
        city: '',
        category: 'Home Service',
        avatar: '',
      };

      // Determine dynamic overdue status if not yet paid and past due date
      let effectiveStatus = bill.status || 'PENDING';
      const dueDate = bill.dueDate ? new Date(bill.dueDate) : null;
      if (effectiveStatus === 'PENDING' && dueDate && dueDate < now) {
        effectiveStatus = 'OVERDUE';
      }

      // Calculate days remaining or days overdue
      let daysDiffText = '';
      if (dueDate) {
        const diffMs = dueDate - now;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (effectiveStatus === 'PAID') {
          daysDiffText = 'Settled';
        } else if (diffDays >= 0) {
          daysDiffText = `${diffDays} days left`;
        } else {
          daysDiffText = `${Math.abs(diffDays)} days overdue`;
        }
      }

      return {
        _id: bill._id ? bill._id.toString() : '',
        providerId: pIdStr,
        provider: providerProfile,
        billingMonth: bill.billingMonth || '2026-08',
        billingPeriodStart: bill.billingPeriodStart,
        billingPeriodEnd: bill.billingPeriodEnd,
        totalIncome: Number(bill.totalIncome || 0),
        commissionRate: Number(bill.commissionRate || 0.05),
        serviceChargeAmount: Number(bill.serviceChargeAmount || 0),
        dueDate: bill.dueDate,
        daysDiffText,
        status: effectiveStatus,
        isSuspended: Boolean(bill.isSuspended),
        completedBookingsCount: bill.completedBookingsCount || (bill.completedBookingIds ? bill.completedBookingIds.length : 0),
        paymentDetails: {
          amountPaid: Number(bill.paymentDetails?.amountPaid || (bill.status === 'PAID' ? bill.serviceChargeAmount : 0)),
          paidAt: bill.paymentDetails?.paidAt || (bill.status === 'PAID' ? bill.updatedAt || bill.createdAt : null),
          stripeSessionId: bill.paymentDetails?.stripeSessionId || null,
          receiptUrl: bill.paymentDetails?.receiptUrl || '',
          currency: bill.paymentDetails?.currency || 'lkr',
          paymentStatus: bill.paymentDetails?.paymentStatus || (bill.status === 'PAID' ? 'completed' : 'unpaid'),
        },
        createdAt: bill.createdAt,
        updatedAt: bill.updatedAt,
      };
    });

    // 4. Calculate Global Summary Metrics (from all bills)
    const totalInvoiced = enrichedList.reduce((acc, b) => acc + b.serviceChargeAmount, 0);
    const totalCollected = enrichedList.filter(b => b.status === 'PAID').reduce((acc, b) => acc + b.serviceChargeAmount, 0);
    const totalPending = enrichedList.filter(b => b.status !== 'PAID').reduce((acc, b) => acc + b.serviceChargeAmount, 0);
    const totalGrossVolume = enrichedList.reduce((acc, b) => acc + b.totalIncome, 0);

    const paidCount = enrichedList.filter(b => b.status === 'PAID').length;
    const pendingCount = enrichedList.filter(b => b.status === 'PENDING').length;
    const overdueCount = enrichedList.filter(b => b.status === 'OVERDUE').length;
    const suspendedCount = enrichedList.filter(b => b.status === 'SUSPENDED' || b.isSuspended).length;
    const complianceRate = enrichedList.length > 0 ? ((paidCount / enrichedList.length) * 100).toFixed(1) : '100.0';

    // 5. Apply Requested Filters
    let filtered = [...enrichedList];

    // Filter by Month
    if (month && month !== 'ALL' && month !== 'All Months') {
      filtered = filtered.filter(b => b.billingMonth === month);
    }

    // Filter by Status
    if (status && status !== 'ALL') {
      filtered = filtered.filter(b => b.status.toUpperCase() === status.toUpperCase());
    }

    // Filter by District
    if (district && district !== 'All' && district !== 'All Districts') {
      filtered = filtered.filter(b => (b.provider.district || '').toLowerCase() === district.trim().toLowerCase());
    }

    // Search Query (Provider name, phone, email, category)
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(b => 
        (b.provider.fullName && b.provider.fullName.toLowerCase().includes(q)) ||
        (b.provider.email && b.provider.email.toLowerCase().includes(q)) ||
        (b.provider.phone && b.provider.phone.toLowerCase().includes(q)) ||
        (b.provider.district && b.provider.district.toLowerCase().includes(q)) ||
        (b.provider.category && b.provider.category.toLowerCase().includes(q)) ||
        (b.billingMonth && b.billingMonth.toLowerCase().includes(q))
      );
    }

    // Extract available distinct months for the dropdown selector
    const availableMonths = Array.from(new Set(allBills.map(b => b.billingMonth).filter(Boolean))).sort().reverse();
    if (!availableMonths.includes('2026-08')) availableMonths.unshift('2026-08');

    return res.status(200).json({
      success: true,
      data: filtered,
      summary: {
        totalInvoiced,
        totalCollected,
        totalPending,
        totalGrossVolume,
        complianceRate,
        totalBillsCount: enrichedList.length,
        paidCount,
        pendingCount,
        overdueCount,
        suspendedCount,
      },
      availableMonths,
    });
  } catch (error) {
    console.error('getMonthlyCommissionPayments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly commission payments',
      error: error.message,
    });
  } finally {
    if (providerConn) {
      try {
        await providerConn.close();
      } catch (e) {}
    }
  }
};

const nodemailer = require('nodemailer');

// Nodemailer Transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT, 10) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'assigmentgroupy@gmail.com',
    pass: process.env.SMTP_PASS || 'iehl zcwp pdmy anld',
  },
});

/**
 * POST /api/monthly-commission-payments/:id/remind
 * Sends an administrative payment reminder for pending/overdue 5% commission via BOTH Email and System In-App Notification.
 */
exports.sendPaymentReminder = async (req, res) => {
  let providerConn = null;
  try {
    const { id } = req.params;
    providerConn = await getProviderDbConn();
    const billingColl = providerConn.collection('commissionbillings');
    const provColl = providerConn.collection('providers');
    const notifColl = providerConn.collection('providernotifications');

    const bill = await billingColl.findOne({ _id: new mongoose.Types.ObjectId(id) });
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Commission billing record not found' });
    }

    // 1. Fetch provider details
    let provider = await provColl.findOne({ _id: bill.providerId });
    if (!provider && mongoose.connection && mongoose.connection.db) {
      provider = await mongoose.connection.db.collection('providers').findOne({ _id: bill.providerId });
    }

    const providerEmail = provider?.email || 'chaveenProvider@gmail.com';
    const providerName = provider?.fullName || provider?.name || 'Service Provider';
    const amountDue = bill.serviceChargeAmount || 0;
    const dueDateStr = bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Immediate';

    // 2. Dispatch In-App System Notification & Real-Time Socket
    const notifTitle = `Payment Reminder: ${bill.billingMonth} Commission Due`;
    const notifMessage = `Dear ${providerName}, your 5% platform service charge of Rs. ${amountDue.toLocaleString()} LKR for ${bill.billingMonth} is pending. Please settle via the payment portal before ${dueDateStr}.`;

    // A. Direct insert into adminService ProviderNotification (FinanceManagement DB)
    try {
      const ProviderNotification = require('../models/ProviderNotification');
      await ProviderNotification.create({
        providerId: bill.providerId,
        title: notifTitle,
        message: notifMessage,
        type: 'admin',
        isRead: false,
      });
      console.log(`[ADMIN NOTIFICATION SAVED] For provider ${bill.providerId}`);
    } catch (dbNotifErr) {
      console.warn('Direct ProviderNotification create warning:', dbNotifErr.message);
    }

    // B. Post to authService to trigger real-time WebSocket push
    try {
      const axios = require('axios');
      const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:4003';
      await axios.post(`${authServiceUrl}/admin/notify-provider-internal`, {
        providerId: bill.providerId.toString(),
        title: notifTitle,
        message: notifMessage,
        type: 'admin',
        category: 'admin',
      });
      console.log(`[SOCKET NOTIFICATION DISPATCHED] via authService to provider ${bill.providerId}`);
    } catch (authNotifErr) {
      console.warn('AuthService socket dispatch warning:', authNotifErr.message);
    }

    // 3. Dispatch Official Branded Email
    let emailSent = false;
    if (providerEmail && providerEmail !== 'N/A') {
      try {
        const mailOptions = {
          from: process.env.EMAIL_FROM || '"WorkWave Platform" <assigmentgroupy@gmail.com>',
          to: providerEmail,
          subject: `[WorkWave] Payment Reminder: 5% Platform Commission for ${bill.billingMonth}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; text-align: center; color: #ffffff;">
                <h2 style="margin: 0; font-size: 22px; font-weight: 800;">WorkWave Platform Services</h2>
                <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Monthly 5% Service Charge Reminder</p>
              </div>

              <div style="padding: 28px; color: #334155; line-height: 1.6;">
                <p style="font-size: 16px; font-weight: 600; color: #0f172a; margin-top: 0;">Dear ${providerName},</p>
                <p style="font-size: 14px;">
                  This is a friendly reminder from WorkWave Administration regarding your <strong>5% Platform Service Charge</strong> for completed bookings in <strong>${bill.billingMonth}</strong>.
                </p>

                <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 18px; margin: 20px 0;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #64748b; font-size: 13px;">Billing Month:</span>
                    <strong style="color: #0f172a; font-size: 13px;">${bill.billingMonth}</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #64748b; font-size: 13px;">Gross Provider Earnings:</span>
                    <strong style="color: #0f172a; font-size: 13px;">Rs. ${(bill.totalIncome || 0).toLocaleString()} LKR</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #64748b; font-size: 13px;">5% Commission Due:</span>
                    <strong style="color: #059669; font-size: 16px;">Rs. ${amountDue.toLocaleString()} LKR</strong>
                  </div>
                  <div style="display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
                    <span style="color: #64748b; font-size: 13px;">Payment Due Date:</span>
                    <strong style="color: #e11d48; font-size: 13px;">${dueDateStr}</strong>
                  </div>
                </div>

                <p style="font-size: 13.5px; color: #475569;">
                  Please log in to your WorkWave Provider Mobile App and settle the outstanding amount to maintain uninterrupted booking allocations and priority listing.
                </p>

                <div style="margin-top: 28px; padding-top: 18px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8; text-align: center;">
                  WorkWave Technologies (Pvt) Ltd • Automated Financial Notification
                </div>
              </div>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        emailSent = true;
        console.log(`[EMAIL REMINDER SENT] To ${providerEmail}`);
      } catch (mailErr) {
        console.warn('Email dispatch warning:', mailErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Payment reminder successfully dispatched to ${providerName} via ${emailSent ? 'Email & In-App Notification' : 'In-App System Notification'}.`,
    });
  } catch (error) {
    console.error('sendPaymentReminder error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send payment reminder',
      error: error.message,
    });
  } finally {
    if (providerConn) {
      try {
        await providerConn.close();
      } catch (e) {}
    }
  }
};

/**
 * PATCH /api/monthly-commission-payments/:id/mark-paid
 * Manually marks a monthly commission billing as PAID by Administrator.
 */
exports.markCommissionPaid = async (req, res) => {
  let providerConn = null;
  try {
    const { id } = req.params;
    const { paymentNote, transactionReference } = req.body;

    providerConn = await getProviderDbConn();
    const billingColl = providerConn.collection('commissionbillings');
    const txColl = providerConn.collection('transactions');

    const bill = await billingColl.findOne({ _id: new mongoose.Types.ObjectId(id) });
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Commission billing record not found' });
    }

    const now = new Date();
    await billingColl.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      {
        $set: {
          status: 'PAID',
          isSuspended: false,
          'paymentDetails.amountPaid': bill.serviceChargeAmount,
          'paymentDetails.paidAt': now,
          'paymentDetails.paymentStatus': 'completed',
          'paymentDetails.stripeSessionId': transactionReference || `MANUAL_ADMIN_${Date.now()}`,
          updatedAt: now,
        }
      }
    );

    // Upsert transaction log
    try {
      await txColl.insertOne({
        providerId: bill.providerId,
        type: 'commission_service_charge',
        amountPaid: bill.serviceChargeAmount,
        boostAmount: 0,
        status: 'completed',
        paidAt: now,
        note: paymentNote || 'Manually approved by Administrator',
        createdAt: now,
        updatedAt: now,
      });
    } catch (txErr) {
      console.warn('Transaction log insert warning:', txErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Commission bill for ${bill.billingMonth} successfully marked as PAID.`,
    });
  } catch (error) {
    console.error('markCommissionPaid error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error.message,
    });
  } finally {
    if (providerConn) {
      try {
        await providerConn.close();
      } catch (e) {}
    }
  }
};
