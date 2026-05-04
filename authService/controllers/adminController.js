const Admin = require('../models/Admin');
const Provider = require('../models/Provider');
const Seeker = require('../models/Seeker');
const Notification = require('../models/Notification');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { extractNicFromImage } = require('../utils/ocr');
const { sendApprovalEmail, sendRejectionEmail } = require('../utils/emailService');

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
