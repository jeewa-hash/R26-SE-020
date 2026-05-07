const Admin = require('../models/Admin');
const Provider = require('../models/Provider');
const Seeker = require('../models/Seeker');
const Notification = require('../models/Notification');
const ProviderNotification = require('../models/ProviderNotification');
const SeekerNotification = require('../models/SeekerNotification');
const HighDemandAlertLog = require('../models/HighDemandAlertLog');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { extractNicFromImage } = require('../utils/ocr');
const { sendApprovalEmail, sendRejectionEmail, sendHighDemandEmail } = require('../utils/emailService');
const { createAuditLog } = require('../utils/auditLogger');
const AuditLog = require('../models/AuditLog');


// Email transporter (same config as seeker)
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "assigmentgroupy@gmail.com",
    pass: "iehl zcwp pdmy anld",
  },
});

// Middleware to verify admin JWT token
exports.verifyAdmin = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    req.user = decoded.user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

// Register a new admin (only by an existing logged-in admin)
exports.register = async (req, res) => {
  try {
    const { fullName, nic, email, password, telephone, district } = req.body;

    // Check if admin already exists with this email
    let existingEmail = await Admin.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Admin already exists with this email' });
    }

    // Check if admin already exists with this NIC
    let existingNic = await Admin.findOne({ nic });
    if (existingNic) {
      return res.status(400).json({ message: 'Admin already exists with this NIC' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = new Admin({
      fullName,
      nic,
      email,
      password: hashedPassword,
      telephone,
      district,
      role: 'Admin',
    });

    await admin.save();

    // Create Audit Log
    const currentAdmin = await Admin.findById(req.user.id);
    await createAuditLog({
      action: 'Admin Registered',
      category: 'Admin',
      admin: currentAdmin,
      target: { id: admin._id, name: admin.fullName, type: 'Admin' }
    });

    // Send credentials email to the new admin
    const mailOptions = {
      from: '"WorkWave Admin" <assigmentgroupy@gmail.com>',
      to: email,
      subject: "Your Admin Account Credentials - WorkWave",
      text: `Hello ${fullName},\n\nYour admin account has been created successfully.\n\nHere are your login credentials:\nEmail: ${email}\nPassword: ${password}\n\nPlease login at your earliest convenience and keep your credentials safe.\n\nRegards,\nWorkWave Admin Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #6366f1;">Welcome to WorkWave Admin Panel</h2>
          <p>Hello <strong>${fullName}</strong>,</p>
          <p>Your admin account has been created successfully.</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Email:</strong> ${email}</p>
            <p style="margin: 4px 0;"><strong>Password:</strong> ${password}</p>
          </div>
          <p>Please login at your earliest convenience and keep your credentials safe.</p>
          <p style="color: #6b7280; font-size: 14px;">Regards,<br/>WorkWave Admin Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: 'Admin registered successfully. Credentials sent to email.', adminId: admin._id });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    if (admin.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked by the Administrator.' });
    }

    const payload = {
      user: {
        id: admin._id,
        role: admin.role,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1d' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          role: admin.role,
          admin: {
            id: admin._id,
            fullName: admin.fullName,
            email: admin.email,
            district: admin.district,
          },
          message: 'Logged in successfully',
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin Logout
exports.logout = async (req, res) => {
  try {
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current admin profile
exports.getProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select('-password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.json(admin);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const adminCount = await Admin.countDocuments();
    const providerCount = await Provider.countDocuments();
    const seekerCount = await Seeker.countDocuments();

    res.json({
      adminCount,
      providerCount,
      seekerCount
    });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err.message);
    res.status(500).json({ message: 'Server error while fetching stats' });
  }
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    const providers = await Provider.find().select('-password');
    const seekers = await Seeker.find().select('-password');

    res.json({
      admins,
      providers,
      seekers
    });
  } catch (err) {
    console.error('Error fetching all users:', err.message);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
};

// Get real user growth data for analytics
exports.getUserGrowthData = async (req, res) => {
  try {
    const seekers = await Seeker.find({}, 'createdAt');
    const providers = await Provider.find({}, 'createdAt');

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();

    const processGrowth = (users) => {
      const monthlyCounts = Array(12).fill(0);
      users.forEach(user => {
        const date = new Date(user.createdAt);
        if (date.getFullYear() === currentYear) {
          monthlyCounts[date.getMonth()]++;
        }
      });

      let cumulative = 0;
      return monthlyCounts.map((count, index) => {
        cumulative += count;
        return {
          name: months[index],
          date: `${currentYear}-${String(index + 1).padStart(2, '0')}-01`,
          count: cumulative
        };
      });
    };

    const seekerGrowth = processGrowth(seekers);
    const providerGrowth = processGrowth(providers);

    const combinedData = months.map((month, index) => ({
      name: month,
      date: seekerGrowth[index].date,
      seekers: seekerGrowth[index].count,
      providers: providerGrowth[index].count,
      total: seekerGrowth[index].count + providerGrowth[index].count
    }));

    res.json(combinedData);
  } catch (err) {
    console.error('Error fetching user growth data:', err.message);
    res.status(500).json({ message: 'Server error while fetching growth data' });
  }
};

// Helper to get model by type
const getModelByType = (type) => {
  if (type === 'admin') return Admin;
  if (type === 'provider') return Provider;
  if (type === 'seeker') return Seeker;
  return null;
};

// Update user details
exports.updateUser = async (req, res) => {
  try {
    const { type, id } = req.params;
    const Model = getModelByType(type);
    
    if (!Model) return res.status(400).json({ message: 'Invalid user type' });

    // Prevent password updates through this route
    if (req.body.password) {
      delete req.body.password;
    }

    const updatedUser = await Model.findByIdAndUpdate(id, req.body, { new: true }).select('-password');
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    // Create Audit Log
    const currentAdmin = await Admin.findById(req.user.id);
    await createAuditLog({
      action: `User Updated (${type})`,
      category: 'User',
      admin: currentAdmin,
      target: { id: updatedUser._id, name: updatedUser.name || updatedUser.fullName || updatedUser.email, type }
    });

    res.json(updatedUser);
  } catch (err) {
    console.error('Error updating user:', err.message);
    res.status(500).json({ message: 'Server error while updating user' });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { type, id } = req.params;
    const Model = getModelByType(type);
    
    if (!Model) return res.status(400).json({ message: 'Invalid user type' });

    const deletedUser = await Model.findByIdAndDelete(id);
    if (!deletedUser) return res.status(404).json({ message: 'User not found' });

    // Create Audit Log
    const currentAdmin = await Admin.findById(req.user.id);
    await createAuditLog({
      action: `User Deleted (${type})`,
      category: 'User',
      admin: currentAdmin,
      target: { id: deletedUser._id, name: deletedUser.name || deletedUser.fullName || deletedUser.email, type }
    });

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err.message);
    res.status(500).json({ message: 'Server error while deleting user' });
  }
};

// Toggle user status (Block/Unblock)
exports.toggleUserStatus = async (req, res) => {
  try {
    const { type, id } = req.params;
    const Model = getModelByType(type);

    if (!Model) return res.status(400).json({ message: 'Invalid user type' });

    const user = await Model.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isBlocked = !user.isBlocked;
    await user.save();

    // Create Audit Log
    const currentAdmin = await Admin.findById(req.user.id);
    await createAuditLog({
      action: user.isBlocked ? 'User Blocked' : 'User Unblocked',
      category: 'User',
      admin: currentAdmin,
      target: { id: user._id, name: user.name || user.fullName || user.email, type }
    });

    res.json({ message: `User successfully ${user.isBlocked ? 'blocked' : 'unblocked'}`, isBlocked: user.isBlocked });
  } catch (err) {
    console.error('Error toggling user status:', err.message);
    res.status(500).json({ message: 'Server error while toggling status' });
  }
};

// Get all unverified service providers (pending verification)
exports.getUnverifiedProviders = async (req, res) => {
  try {
    const providers = await Provider.find({
      isVerified: false,
      $or: [{ isRejected: false }, { isRejected: { $exists: false } }]
    })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(providers);
  } catch (err) {
    console.error('Error fetching unverified providers:', err.message);
    res.status(500).json({ message: 'Server error while fetching unverified providers' });
  }
};

// Get all rejected service providers
exports.getRejectedProviders = async (req, res) => {
  try {
    const providers = await Provider.find({ isRejected: true })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(providers);
  } catch (err) {
    console.error('Error fetching rejected providers:', err.message);
    res.status(500).json({ message: 'Server error while fetching rejected providers' });
  }
};

// Get provider verification details with OCR extraction
exports.getProviderVerificationDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const provider = await Provider.findById(id).select('-password');
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    // Run OCR if not already extracted and image exists
    if (!provider.extractedNicNumber && provider.nicImage) {
      const extracted = await extractNicFromImage(provider.nicImage);
      if (extracted) {
        provider.extractedNicNumber = extracted;
        await provider.save();
      }
    }

    res.json(provider);
  } catch (err) {
    console.error('Error fetching verification details:', err.message);
    res.status(500).json({ message: 'Server error while fetching verification details' });
  }
};

// Approve or reject a provider verification
exports.verifyProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminNote } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Use "approve" or "reject".' });
    }

    if (action === 'reject' && (!adminNote || !adminNote.trim())) {
      return res.status(400).json({ message: 'Admin note is required when rejecting a provider.' });
    }

    const provider = await Provider.findById(id);
    if (!provider) {
      return res.status(404).json({ message: 'Provider not found' });
    }

    if (action === 'approve') {
      provider.isVerified = true;
      provider.isRejected = false;
      provider.isBlocked = false;
      provider.adminNote = '';
      await provider.save();

      // Create Audit Log
      const currentAdmin = await Admin.findById(req.user.id);
      await createAuditLog({
        action: 'NIC Approved',
        category: 'NIC',
        admin: currentAdmin,
        target: { id: provider._id, name: provider.email, type: 'Provider' }
      });

      // Send approval email
      try {
        await sendApprovalEmail(provider.email, provider.email.split('@')[0]);
      } catch (emailErr) {
        console.error('[Verify] Failed to send approval email:', emailErr.message);
      }

      res.json({ message: 'Provider approved successfully', isVerified: true });
    } else {
      provider.isVerified = false;
      provider.isRejected = true;
      provider.isBlocked = false;
      provider.adminNote = adminNote.trim();
      await provider.save();

      // Create Audit Log
      const currentAdmin = await Admin.findById(req.user.id);
      await createAuditLog({
        action: 'NIC Rejected',
        category: 'NIC',
        admin: currentAdmin,
        target: { id: provider._id, name: provider.email, type: 'Provider' },
        metadata: { reason: adminNote.trim() }
      });

      // Send rejection email
      try {
        await sendRejectionEmail(provider.email, provider.email.split('@')[0], adminNote.trim());
      } catch (emailErr) {
        console.error('[Verify] Failed to send rejection email:', emailErr.message);
      }

      res.json({ message: 'Provider rejected successfully', isVerified: false, isRejected: true });
    }
  } catch (err) {
    console.error('Error verifying provider:', err.message);
    res.status(500).json({ message: 'Server error while verifying provider' });
  }
};

// Get all notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err.message);
    res.status(500).json({ message: 'Server error while fetching notifications' });
  }
};

// Mark a single notification as read
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ message: 'Notification marked as read', notification });
  } catch (err) {
    console.error('Error marking notification as read:', err.message);
    res.status(500).json({ message: 'Server error while updating notification' });
  }
};

// Mark all notifications as read
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all notifications as read:', err.message);
    res.status(500).json({ message: 'Server error while updating notifications' });
  }
};

// Clear all notifications
exports.clearAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({});
    res.json({ message: 'All notifications cleared' });
  } catch (err) {
    console.error('Error clearing notifications:', err.message);
    res.status(500).json({ message: 'Server error while clearing notifications' });
  }
};

// Get audit logs with filtering, pagination, and sorting
exports.getAuditLogs = async (req, res) => {
  try {
    const { category, startDate, endDate, page = 1, limit = 10 } = req.query;
    
    let query = {};
    if (category) query.category = category;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    res.json({
      logs,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page)
    });
  } catch (err) {
    console.error('Error fetching audit logs:', err.message);
    res.status(500).json({ message: 'Server error while fetching audit logs' });
  }
};

// Internal route for other services to create audit logs
exports.createAuditLogInternal = async (req, res) => {
  try {
    const { action, category, adminId, target, metadata } = req.body;
    
    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ message: 'Admin not found' });

    await createAuditLog({
      action,
      category,
      admin,
      target,
      metadata
    });

    res.status(201).json({ message: 'Audit log created' });
  } catch (err) {
    console.error('Error in internal audit log creation:', err.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Dispatch High Demand Alerts to Providers
exports.dispatchHighDemandAlerts = async (req, res) => {
  try {
    const { category, district, timeframe, avgDemand, confidence } = req.body;
    
    // Check if we already sent this specific alert today
    const todayStr = new Date().toISOString().split('T')[0];
    
    const existingLog = await HighDemandAlertLog.findOne({
      category,
      district,
      timeframe,
      date: todayStr
    });

    if (existingLog) {
      return res.status(200).json({ message: 'Alerts already dispatched for this category, district, and timeframe today. Skipping to prevent spam.' });
    }

    // Find verified, active providers in the district and category
    const query = {
      role: 'ServiceProvider',
      isVerified: true,
      isBlocked: false,
    };
    if (district !== 'All Districts') query.district = district;
    if (category !== 'All Categories') query.category = category;

    const providers = await Provider.find(query);

    // Also Dispatch notifications to Seekers in that district
    // This helps seekers know when demand is high so they can book in advance
    const seekers = await Seeker.find({ 
      district: district === 'All Districts' ? { $exists: true } : district,
      isEmailVerified: true,
      isBlocked: false
    });

    if (providers.length === 0 && seekers.length === 0) {
      // Record log even if no one found, to not retry
      await HighDemandAlertLog.create({ category, district, timeframe, date: todayStr });
      return res.status(200).json({ message: 'No providers or seekers found to send alerts to.' });
    }

    // Dispatch notifications to Providers (Emails skipped as per requirement)
    for (const provider of providers) {
      await ProviderNotification.create({
        providerId: provider._id,
        title: `🚀 High Demand Alert: ${category}!`,
        message: `High demand predicted for ${category} in ${district} for ${timeframe}. Stay active to grab more job requests and increase your earnings!`,
        type: 'high_demand_alert'
      });
    }

    for (const seeker of seekers) {
      await SeekerNotification.create({
        seekerId: seeker._id,
        title: `🚀 High Demand Alert: ${category}!`,
        message: `We're seeing high demand for ${category} in ${district} for ${timeframe}. Book your service early to ensure availability!`,
        type: 'high_demand_alert'
      });
    }

    // Save to tracking DB
    await HighDemandAlertLog.create({ category, district, timeframe, date: todayStr });

    // Optional: Log to AuditLog
    await createAuditLog({
      action: 'Dispatched High Demand Alerts',
      category: 'Demand Forecasting',
      admin: req.user,
      target: { name: `Alerts sent to ${providers.length} providers and ${seekers.length} seekers`, type: 'ALERT' },
      metadata: { category, district, timeframe }
    });

    res.status(200).json({ message: `High Demand alerts successfully sent to ${providers.length} providers and ${seekers.length} seekers.` });
  } catch (err) {
    console.error('Error dispatching high demand alerts:', err);
    res.status(500).json({ message: 'Internal server error while dispatching alerts' });
  }
};
