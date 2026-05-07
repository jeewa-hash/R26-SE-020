const Seeker = require('../models/Seeker');
const SeekerNotification = require('../models/SeekerNotification');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "assigmentgroupy@gmail.com",
    pass: "iehl zcwp pdmy anld",
  },
});

// Middleware to verify JWT token
exports.verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, nicNumber, telephone, district, latitude, longitude } = req.body;

    // Security Check
    if (role === 'Admin' || role === 'ServiceProvider') {
      return res.status(403).json({ message: 'Unauthorized role assignment' });
    }

    let user = await Seeker.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    let existingNic = await Seeker.findOne({ nicNumber });
    if (existingNic) {
      return res.status(400).json({ message: 'User already exists with this NIC number' });
    }

    let profilePicture = null;
    if (req.file) {
      profilePicture = req.file.path;
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Location is required' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    user = new Seeker({
      name,
      email,
      password: hashedPassword,
      role: 'Seeker',
      nicNumber,
      telephone,
      district,
      location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
      profilePicture,
      isEmailVerified: false,
      otp,
      otpExpires
    });

    await user.save();

    // Send Email
    const mailOptions = {
      from: '"WorkWave Service App" <assigmentgroupy@gmail.com>',
      to: email,
      subject: "Verify Your Email - WorkWave",
      text: `Welcome to WorkWave! Your OTP for email verification is: ${otp}. It will expire in 10 minutes.`,
      html: `<h3>Welcome to WorkWave!</h3><p>Your OTP for email verification is: <strong>${otp}</strong></p><p>It will expire in 10 minutes.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: 'User registered successfully. Please check your email for OTP.', email: user.email });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await Seeker.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: 'Email is already verified' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (new Date() > user.otpExpires) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    user.isEmailVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Email verified successfully! You can now login.' });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
}

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await Seeker.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked by the Administrator.' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message: "Email verification pending.",
        requiresOTP: true,
        email: user.email
      });
    }

    const payload = {
      user: {
        id: user._id,
        role: user.role,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1d' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, role: user.role, message: 'Logged in successfully' });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.logout = async (req, res) => {
  try {
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Notification Controllers
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await SeekerNotification.find({ seekerId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching seeker notifications:', err.message);
    res.status(500).json({ message: 'Server error while fetching notifications' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await SeekerNotification.findOneAndUpdate(
      { _id: id, seekerId: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json(notification);
  } catch (err) {
    console.error('Error marking seeker notification as read:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await SeekerNotification.updateMany(
      { seekerId: req.user.id, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all seeker notifications as read:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.clearNotifications = async (req, res) => {
  try {
    await SeekerNotification.deleteMany({ seekerId: req.user.id });
    res.json({ message: 'All notifications cleared' });
  } catch (err) {
    console.error('Error clearing seeker notifications:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};
