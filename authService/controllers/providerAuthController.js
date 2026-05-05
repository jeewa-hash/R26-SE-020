const Provider = require('../models/Provider');
const Notification = require('../models/Notification');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { sendVerificationPendingEmail } = require('../utils/emailService');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Generate Bio Logic
exports.generateBio = async (req, res) => {
  try {
    const { rawBio } = req.body;
    
    if (!rawBio || !process.env.GEMINI_API_KEY) {
      return res.status(400).json({ message: 'Raw text or API key missing' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Rewrite this simple text into a professional service provider bio for a portfolio. Keep it concise (2-3 sentences) and highly professional. Do not add placeholder info like [Your Name]. Just provide the bio text itself. Original text: "${rawBio}"`;
    const result = await model.generateContent(prompt);
    const generatedBio = result.response.text().trim();

    res.status(200).json({ generatedBio });
  } catch (err) {
    console.error('Gemini AI Error:', err.message);
    res.status(500).json({ message: 'Failed to generate bio' });
  }
};

// Registration Logic
exports.register = async (req, res) => {
  try {
    const { email, password, role, nicNumber, category, district, latitude, longitude, telephone, rawBio, gender, address } = req.body;

    // Security Check: Prevent users from registering as Admin
    if (role === 'Admin') {
      return res.status(403).json({ message: 'Unauthorized role assignment' });
    }

    // Check if user already exists with email
    let user = await Provider.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Check if user already exists with NIC
    let existingNic = await Provider.findOne({ nicNumber });
    if (existingNic) {
      return res.status(400).json({ message: 'User already exists with this NIC number' });
    }

    // Get the path of the uploaded files if exist
    let nicImage = null;
    let profileImage = null;
    if (req.files) {
      if (req.files['nicImage']) {
        nicImage = req.files['nicImage'][0].path;
      }
      if (req.files['profileImage']) {
        profileImage = req.files['profileImage'][0].path;
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new Provider
    user = new Provider({
      email,
      password: hashedPassword,
      role,
      nicNumber,
      nicImage,
      profileImage,
      telephone,
      category,
      district,
      bio: rawBio || '',
      gender: gender || undefined,
      address: address || undefined,
      location: (latitude && longitude) ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) } : undefined,
      isVerified: false,
    });

    await user.save();

    // Send verification pending email
    try {
      await sendVerificationPendingEmail(user.email, user.email.split('@')[0]);
    } catch (emailErr) {
      console.error('[Register] Failed to send verification pending email:', emailErr.message);
      // Don't fail registration if email fails
    }

    // Create admin notification for new provider registration
    try {
      const notification = new Notification({
        type: 'provider_registration',
        title: 'New Provider Registration',
        message: `A new service provider (${email}) has registered and is awaiting NIC verification.`,
        relatedId: user._id.toString(),
        isRead: false,
      });
      await notification.save();
      console.log('[Notification] Created for new provider:', email);
    } catch (notifErr) {
      console.error('[Notification] Failed to create notification:', notifErr.message);
    }

    // Remove password from response
    const userResponse = {
      _id: user._id,
      email: user.email,
      role: user.role,
      nicNumber: user.nicNumber,
      nicImage: user.nicImage,
      profileImage: user.profileImage,
      bio: user.bio,
      gender: user.gender,
      address: user.address,
      isVerified: user.isVerified,
    };

    res.status(201).json({ message: 'User registered successfully', user: userResponse });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login Logic
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await Provider.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid Credentials' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked by the Administrator.' });
    }

    // Check Verification Status
    if (!user.isVerified) {
      return res.status(403).json({ 
        message: "Verification Pending! We've received your NIC details. You’ll be able to log in once our admin approves your profile. After admin approval you will receive an email to inform it." 
      });
    }

    // Generate JWT
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
