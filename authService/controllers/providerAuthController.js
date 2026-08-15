const Provider = require('../models/Provider');
const Notification = require('../models/Notification');
const socket = require('../utils/socket');
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
    const { email, password, nicNumber, category, district, latitude, longitude, telephone, rawBio, gender, address } = req.body;

    // Force provider role to ServiceProvider
    const forcedRole = 'ServiceProvider';

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
      role: forcedRole,
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

      // Emit real-time notification to admin room
      const io = socket.getIO();
      io.to('admin_room').emit('new_notification', notification);
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

// Middleware to verify provider
exports.verifyProvider = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.user.role !== 'ServiceProvider') {
      return res.status(403).json({ message: 'Access denied. Provider only.' });
    }
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Fetch Provider Notifications
const ProviderNotification = require('../models/ProviderNotification');

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await ProviderNotification.find({ providerId: req.user.id })
      .sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err.message);
    res.status(500).json({ message: 'Server error while fetching notifications' });
  }
};

// Mark Notification as Read
exports.markNotificationAsRead = async (req, res) => {
  try {
    const notification = await ProviderNotification.findOneAndUpdate(
      { _id: req.params.id, providerId: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.status(200).json(notification);
  } catch (err) {
    console.error('Error marking notification as read:', err.message);
    res.status(500).json({ message: 'Server error while updating notification' });
  }
};

// Mark all Notifications as Read
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    await ProviderNotification.updateMany(
      { providerId: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all notifications as read:', err.message);
    res.status(500).json({ message: 'Server error while updating notifications' });
  }
};

// Clear all Notifications
exports.clearAllNotifications = async (req, res) => {
  try {
    await ProviderNotification.deleteMany({ providerId: req.user.id });
    res.status(200).json({ message: 'All notifications cleared' });
  } catch (err) {
    console.error('Error clearing notifications:', err.message);
    res.status(500).json({ message: 'Server error while clearing notifications' });
  }
};

// Match providers from an existing model output payload
const normalize = (value) => String(value ?? '').trim().toLowerCase();
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

exports.matchProvidersFromModelOutput = async (req, res) => {
  try {
    const requestPayload = req.body || {};
    const summary = requestPayload.summary || requestPayload;
    const providerMatching = summary.provider_matching || requestPayload.provider_matching || {};
    const criteria = providerMatching.criteria || {};

    const stepBreakdown = Array.isArray(summary.step_breakdown) ? summary.step_breakdown : [];
    const addressFromBreakdown = stepBreakdown.find((item) => {
      const label = String(item?.label || '').toLowerCase();
      return label.includes('address') || label.includes('location');
    })?.answer;

    const serviceCategory = normalize(criteria.service_category || summary.detected_category || summary.service_category);
    const urgencyLevel = normalize(criteria.urgency_level || summary.urgency_level || '');
    const serviceLocation = normalize(criteria.service_location || addressFromBreakdown || summary.location_summary || '');
    const providerTags = Array.isArray(criteria.provider_tags)
      ? criteria.provider_tags.map((tag) => normalize(tag))
      : [];

    const gps = requestPayload.gps || summary.gps || null;
    const requestedLat = Number(gps?.lat ?? requestPayload.latitude ?? summary.latitude);
    const requestedLng = Number(gps?.lng ?? requestPayload.longitude ?? summary.longitude);

    const matchingQuery = {
      role: 'ServiceProvider',
      isVerified: true,
      isBlocked: false,
    };

    if (serviceCategory) {
      matchingQuery.category = { $regex: serviceCategory, $options: 'i' };
    }

    const providers = await Provider.find(matchingQuery).select('-password -__v');

    const rankedProviders = providers
      .map((provider) => {
        const providerCategory = normalize(provider.category);
        const providerDistrict = normalize(provider.district || provider.address || '');
        const providerLocation = provider.location || {};
        const providerTagSet = [provider.category, provider.district, provider.address]
          .filter(Boolean)
          .map((tag) => normalize(tag));

        let score = 0;
        const reasons = [];

        if (serviceCategory && providerCategory.includes(serviceCategory)) {
          score += 60;
          reasons.push('category match');
        } else if (providerCategory) {
          score += 20;
          reasons.push('related provider category');
        }

        if (serviceLocation && providerDistrict.includes(serviceLocation)) {
          score += 25;
          reasons.push('district/location match');
        } else if (providerDistrict) {
          score += 10;
          reasons.push('provider location profile available');
        }

        if (urgencyLevel.includes('urgent') || urgencyLevel.includes('high')) {
          score += 8;
          reasons.push('high-priority handling');
        } else {
          score += 4;
        }

        const overlap = providerTags.filter((tag) => providerTagSet.includes(tag));
        if (overlap.length > 0) {
          score += overlap.length * 5;
          reasons.push('tag overlap');
        }

        let distanceKm = null;
        if (
          requestedLat &&
          requestedLng &&
          providerLocation.latitude &&
          providerLocation.longitude
        ) {
          distanceKm = calculateDistanceKm(
            requestedLat,
            requestedLng,
            providerLocation.latitude,
            providerLocation.longitude
          );

          if (distanceKm <= 5) {
            score += 15;
            reasons.push('nearby provider');
          } else if (distanceKm <= 15) {
            score += 8;
            reasons.push('regional provider');
          }
        }

        return {
          providerId: provider._id,
          email: provider.email,
          name: provider.email?.split('@')[0] || 'Service Provider',
          category: provider.category,
          district: provider.district,
          address: provider.address,
          telephone: provider.telephone,
          bio: provider.bio,
          profileImage: provider.profileImage,
          matchScore: score,
          reasons,
          distanceKm: distanceKm ? Number(distanceKm.toFixed(2)) : null,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      criteria: {
        service_category: serviceCategory || criteria.service_category,
        urgency_level: urgencyLevel || criteria.urgency_level,
        service_location: serviceLocation || criteria.service_location,
        detected_object: summary.detected_object || criteria.detected_object || null,
      },
      totalProviders: rankedProviders.length,
      availableProviders: rankedProviders,
      bestProvider: rankedProviders[0] || null,
    });
  } catch (err) {
    console.error('[ProviderMatch] Error:', err.message);
    return res.status(500).json({ message: 'Failed to match providers for the request' });
  }
};
