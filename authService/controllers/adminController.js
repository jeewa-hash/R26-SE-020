const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

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
