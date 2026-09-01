import mongoose from "mongoose";
import axios from "axios";
import RequestQuotation from "../models/RequestQuotation.js";
import Feedback from "../models/feedbackModel.js";

export const createRequestQuotation = async (req, res) => {
  try {
    const {
      seekerId,
      providerId,
      postId,
      sessionId,
      detectedCategory,
      detectedObject,
      modelConfidence,
      stepBreakdown,
      briefDescription,
      urgencyLevel,
      serviceLocation,
      serviceLatitude,
      serviceLongitude,
      location,
      preferredStartTime, // Chaw - Added seeker preferred start time
      preferredEndTime, // Chaw - Added seeker preferred end time/window
      preferredTimeLabel, // Chaw - Added readable preferred time label
      seekerEstimatedDurationHours, // Chaw - Added optional seeker duration estimate
      seekerBudgetAmount, // Chaw - Added optional seeker budget amount
    } = req.body;

    if (
      !seekerId ||
      !providerId ||
      !sessionId ||
      !detectedCategory ||
      !detectedObject
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(seekerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid seeker ID",
      });
    }

    let finalProviderId = providerId;
    let finalPostId = postId || null;
    const adLookupId = postId || providerId;
    let providerAdResolved = false;

    if (mongoose.Types.ObjectId.isValid(adLookupId)) {
      try {
        const providerServiceUrl = (process.env.PROVIDER_SERVICE_URL || "http://127.0.0.1:3002").replace(/\/$/, "");
        const adResponse = await axios.get(`${providerServiceUrl}/api/provider/ads/${adLookupId}`, { timeout: 3000 });
        const maybePost = adResponse.data?.data || adResponse.data?.post || adResponse.data;
        if (maybePost?._id && maybePost?.providerId) {
          finalProviderId = maybePost.providerId?._id || maybePost.providerId;
          finalPostId = maybePost._id;
          providerAdResolved = true;
        }
      } catch (lookupError) {
        if (postId) {
          console.warn("Provider ad lookup warning:", lookupError.message);
        }
      }
    }

    if (postId && !providerAdResolved) {
      return res.status(400).json({
        success: false,
        message: "Unable to verify the selected provider post",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(finalProviderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID",
      });
    }

    if (finalPostId && !mongoose.Types.ObjectId.isValid(finalPostId)) {
      return res.status(400).json({ success: false, message: "Invalid post ID" });
    }

    console.log("REQUEST QUOTATION ID DEBUG:", {
      incomingProviderId: providerId,
      incomingPostId: postId,
      finalProviderId,
      finalPostId,
      sessionId,
    });

    // Check if provider is bookable / penalty-restricted
    try {
      const adminUrl = process.env.ADMIN_SERVICE_URL || "http://127.0.0.1:5001";
      const bookableRes = await axios.get(`${adminUrl}/api/inquiries/check-bookable/${finalProviderId}`, { timeout: 3000 });
      if (bookableRes.data) {
        const pStatus = bookableRes.data;
        if (pStatus.isRestricted || pStatus.isBlocked || (typeof pStatus.penaltyScore === "number" && pStatus.penaltyScore >= 3)) {
          return res.status(403).json({
            success: false,
            error: "PROVIDER_RESTRICTED",
            message: `This service provider is currently restricted from accepting new bookings due to active penalty points (${pStatus.penaltyRatio || '3/3'}). Please select another service provider.`,
          });
        }
      }
    } catch (checkErr) {
      if (checkErr.response && checkErr.response.status === 403) {
        return res.status(403).json(checkErr.response.data);
      }
      console.warn("Provider bookable check note:", checkErr.message);
    }

    if (!Array.isArray(stepBreakdown)) {
      return res.status(400).json({
        success: false,
        message: "Step breakdown must be an array",
      });
    }

    if (preferredStartTime && Number.isNaN(new Date(preferredStartTime).getTime())) { // Chaw - Validate optional preferred start time if provided
      return res.status(400).json({
        success: false,
        message: "Invalid preferredStartTime",
      });
    }

    if (preferredEndTime && Number.isNaN(new Date(preferredEndTime).getTime())) { // Chaw - Validate optional preferred end time if provided
      return res.status(400).json({
        success: false,
        message: "Invalid preferredEndTime",
      });
    }

    if (
      preferredStartTime &&
      preferredEndTime &&
      new Date(preferredStartTime) >= new Date(preferredEndTime)
    ) { // Chaw - Ensure seeker preferred time window is valid
      return res.status(400).json({
        success: false,
        message: "preferredEndTime must be after preferredStartTime",
      });
    }

    if (
      seekerEstimatedDurationHours != null &&
      Number(seekerEstimatedDurationHours) <= 0
    ) { // Chaw - Validate optional seeker duration estimate
      return res.status(400).json({
        success: false,
        message: "seekerEstimatedDurationHours must be greater than 0",
      });
    }

    if (
      seekerBudgetAmount != null &&
      Number(seekerBudgetAmount) < 0
    ) { // Chaw - Validate optional seeker budget amount
      return res.status(400).json({
        success: false,
        message: "seekerBudgetAmount cannot be negative",
      });
    }

    const existingRequest = await RequestQuotation.findOne({
      seekerId,
      providerId: finalProviderId,
      sessionId,
    });

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message: "You have already requested a quotation from this provider for this service.",
        data: existingRequest,
      });
    }

    const resolvedServiceLocation = serviceLocation || location?.address || "";
    const resolvedLatitude = serviceLatitude ?? location?.lat ?? null;
    const resolvedLongitude = serviceLongitude ?? location?.lng ?? null;
    const request = await RequestQuotation.create({
      seekerId,
      providerId: finalProviderId,
      postId: finalPostId,
      sessionId,
      detectedCategory,
      detectedObject,
      modelConfidence,
      stepBreakdown,
      briefDescription,
      urgencyLevel,
      serviceLocation: resolvedServiceLocation,
      serviceLatitude: resolvedLatitude,
      serviceLongitude: resolvedLongitude,
      location: { address: resolvedServiceLocation, lat: resolvedLatitude, lng: resolvedLongitude },
      preferredStartTime: preferredStartTime || null, // Chaw - Save seeker preferred start time if provided
      preferredEndTime: preferredEndTime || null, // Chaw - Save seeker preferred end time if provided
      preferredTimeLabel: preferredTimeLabel || "", // Chaw - Save readable preferred time label
      seekerEstimatedDurationHours: seekerEstimatedDurationHours ?? null, // Chaw - Save seeker duration estimate if provided
      seekerBudgetAmount: seekerBudgetAmount ?? null, // Chaw - Save seeker budget if provided
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Request quotation sent successfully",
      request,
    });
  } catch (error) {
    console.error("CREATE REQUEST QUOTATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const getSeekerRequests = async (req, res) => {
  try {
    const { seekerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(seekerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid seeker ID",
      });
    }

    const requests = await RequestQuotation.find({
      seekerId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("GET SEEKER REQUESTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const getProviderRequests = async (req, res) => {
  try {
    const { providerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID",
      });
    }

    const requests = await RequestQuotation.find({
      providerId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("GET PROVIDER REQUESTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const getSingleRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    const request = await RequestQuotation.findById(id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request quotation not found",
      });
    }

    return res.status(200).json({
      success: true,
      request,
    });
  } catch (error) {
    console.error("GET SINGLE REQUEST ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const updateRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { providerId, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "Provider ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID",
      });
    }

    if (!["pending", "quoted", "accepted", "rejected", "cancelled", "expired"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request quotation status",
      });
    }

    const request = await RequestQuotation.findOne({
      _id: id,
      providerId,
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message:
          "Request not found or provider is not the selected provider",
      });
    }

    if (["accepted", "rejected", "cancelled", "expired"].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: `Request is already ${request.status}`,
      });
    }

    request.status = status;
    await request.save();

    return res.status(200).json({
      success: true,
      message: `Request ${status} successfully`,
      request,
    });
  } catch (error) {
    console.error("UPDATE REQUEST STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

export const markSessionSelection = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { seekerId, acceptedRequestId } = req.body;

    if (!sessionId || !mongoose.Types.ObjectId.isValid(seekerId) ||
        !mongoose.Types.ObjectId.isValid(acceptedRequestId)) {
      return res.status(400).json({ success: false, message: "Invalid session selection data" });
    }

    const selected = await RequestQuotation.findOne({
      _id: acceptedRequestId,
      seekerId,
      sessionId,
    });
    if (!selected) {
      return res.status(404).json({ success: false, message: "Selected request quotation not found" });
    }

    await RequestQuotation.updateMany(
      { seekerId, sessionId, _id: { $ne: selected._id }, status: { $in: ["pending", "quoted"] } },
      { $set: { status: "rejected" } }
    );
    selected.status = "accepted";
    await selected.save();

    return res.status(200).json({
      success: true,
      message: "Request quotation selection updated successfully",
      data: selected,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Unable to update request selection", error: error.message });
  }
};

export const deleteRequestQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const { seekerId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid request ID",
      });
    }

    if (!seekerId) {
      return res.status(400).json({
        success: false,
        message: "Seeker ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(seekerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid seeker ID",
      });
    }

    const request = await RequestQuotation.findOne({
      _id: id,
      seekerId,
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message:
          "Request not found or seeker is not the owner",
      });
    }

    await RequestQuotation.deleteOne({
      _id: id,
      seekerId,
    });

    return res.status(200).json({
      success: true,
      message: "Request quotation deleted successfully",
    });
  } catch (error) {
    console.error("DELETE REQUEST QUOTATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// =======================================================
// GET PERSONALIZED PROVIDER RECOMMENDATIONS FOR SEEKER
// =======================================================
export const getProviderRecommendations = async (req, res) => {
  try {
    const { seekerId } = req.params;
    const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:4003";

    if (!seekerId) {
      return res.status(400).json({
        success: false,
        message: "Seeker ID is required",
      });
    }

    // 1. Fetch seeker info from authService to get seeker's district
    let seekerDistrict = "Colombo";
    let seekerName = "";
    try {
      const seekerRes = await axios.get(`${AUTH_SERVICE_URL}/seeker/user/${seekerId}`);
      if (seekerRes.data) {
        seekerDistrict = seekerRes.data.district || "Colombo";
        seekerName = seekerRes.data.name || "";
      }
    } catch (e) {
      console.warn("Could not fetch seeker details from authService, defaulting district to Colombo:", e.message);
    }

    // 2. Query seeker's booking requests from the last 3 years
    const threeYearsAgo = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000);
    let pastRequests = [];
    try {
      pastRequests = await RequestQuotation.find({
        seekerId: mongoose.Types.ObjectId.isValid(seekerId) ? new mongoose.Types.ObjectId(seekerId) : seekerId,
        createdAt: { $gte: threeYearsAgo },
      }).sort({ createdAt: -1 });
    } catch (dbErr) {
      console.warn("Error querying past requests:", dbErr.message);
    }

    // 3. Count categories and identify Top 5 most booked categories
    const categoryCountMap = {};
    for (const r of pastRequests) {
      const cat = (r.detectedCategory || r.category || "").trim();
      if (cat) {
        categoryCountMap[cat] = (categoryCountMap[cat] || 0) + 1;
      }
    }

    const topCategories = Object.entries(categoryCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat);

    // 4. Fetch all active providers from authService
    let allProviders = [];
    try {
      const provRes = await axios.get(`${AUTH_SERVICE_URL}/providers`);
      if (provRes.data && Array.isArray(provRes.data.providers)) {
        allProviders = provRes.data.providers;
      } else if (Array.isArray(provRes.data)) {
        allProviders = provRes.data;
      }
    } catch (pErr) {
      console.error("Error fetching providers from authService:", pErr.message);
    }

    // Fetch all request quotations to check consecutive cancellation streaks per provider
    let allRequests = [];
    try {
      allRequests = await RequestQuotation.find({}).sort({ createdAt: -1 });
    } catch (e) {
      console.warn("Could not query all requests for streak check:", e.message);
    }
    const requestsByProvider = {};
    for (const req of allRequests) {
      const pid = String(req.providerId);
      if (!requestsByProvider[pid]) requestsByProvider[pid] = [];
      requestsByProvider[pid].push(req);
    }

    // Fetch all feedbacks to calculate real average rating and review counts per provider
    let allFeedbacks = [];
    try {
      allFeedbacks = await Feedback.find({});
    } catch (fbErr) {
      console.warn("Could not query feedbacks:", fbErr.message);
    }
    const feedbackStatsByProvider = {};
    for (const fb of allFeedbacks) {
      const pid = String(fb.providerId);
      if (!feedbackStatsByProvider[pid]) {
        feedbackStatsByProvider[pid] = { total: 0, count: 0 };
      }
      if (typeof fb.rating === "number" && fb.rating > 0) {
        feedbackStatsByProvider[pid].total += fb.rating;
        feedbackStatsByProvider[pid].count += 1;
      }
    }

    const now = new Date();

    // Strict Filter for Recommendations:
    // 1. Must be verified (isVerified: true)
    // 2. Must NOT be blocked, suspended, or rejected
    // 3. Must NOT have active temporary block
    // 4. Must NOT have >3 consecutive missed or cancelled bookings
    // 5. Must have an Average Rating >= 4.0 (with real decimal ratings)
    const eligibleProviders = allProviders.filter((p) => {
      // 1. Verified check
      if (!p.isVerified) return false;

      // 2. Blocked / Suspended / Rejected check
      if (p.isBlocked || p.isRejected || p.isSuspended) return false;
      if (p.blockedUntil && new Date(p.blockedUntil) > now) return false;

      // 3. Stored consecutive rejections / cancellations count
      if (p.consecutiveRejections && p.consecutiveRejections > 3) return false;
      if (p.consecutiveCancellations && p.consecutiveCancellations > 3) return false;

      // 4. Dynamic streak check across past bookings
      const pId = String(p._id || p.id);
      const pReqs = requestsByProvider[pId] || [];
      if (pReqs.length > 0) {
        let consecutiveCancelled = 0;
        for (const req of pReqs) {
          const st = String(req.status || "").toLowerCase();
          if (st === "cancelled" || st === "missed" || st === "rejected") {
            consecutiveCancelled++;
          } else {
            break; // Valid booking found, streak ends
          }
        }
        if (consecutiveCancelled > 3) return false;
      }

      // 5. Average Rating >= 4.0 Check (Fetch real rating from DB with decimals)
      const fbStat = feedbackStatsByProvider[pId];
      let avgRating = 4.8;
      let reviewCount = 0;
      if (fbStat && fbStat.count > 0) {
        avgRating = Number((fbStat.total / fbStat.count).toFixed(1));
        reviewCount = fbStat.count;
      } else if (p.rating && typeof p.rating === "number") {
        avgRating = Number(Number(p.rating).toFixed(1));
        reviewCount = p.reviewCount || 0;
      }

      // Exclude providers with average rating < 4.0
      if (avgRating < 4.0) {
        return false;
      }

      p.computedRating = avgRating;
      p.computedReviewCount = reviewCount;

      return true;
    });

    const normalizedSeekerDistrict = (seekerDistrict || "").trim().toLowerCase();

    // 6. Categorize and rank providers
    const isNewSeeker = topCategories.length === 0;
    let matchedProviders = [];

    if (!isNewSeeker) {
      // Prioritize: Providers in Seeker's District who match one of the Top 5 Categories
      const topCatNormalized = topCategories.map((c) => c.toLowerCase());

      const districtTopCategoryMatches = [];
      const districtOtherMatches = [];
      const otherDistrictTopCatMatches = [];
      const remainingProviders = [];

      for (const p of eligibleProviders) {
        const pDistrict = (p.district || "").trim().toLowerCase();
        const pCat = (p.category || "").trim().toLowerCase();

        const isDistrictMatch = pDistrict === normalizedSeekerDistrict;
        const isCatMatch = topCatNormalized.some(
          (tc) => pCat.includes(tc) || tc.includes(pCat)
        );

        if (isDistrictMatch && isCatMatch) {
          districtTopCategoryMatches.push({
            ...p,
            matchScore: 100,
            matchReason: `Top booked service in ${p.district || seekerDistrict}`,
            isTopCategory: true,
          });
        } else if (isDistrictMatch) {
          districtOtherMatches.push({
            ...p,
            matchScore: 70,
            matchReason: `Verified provider in ${p.district || seekerDistrict}`,
            isTopCategory: false,
          });
        } else if (isCatMatch) {
          otherDistrictTopCatMatches.push({
            ...p,
            matchScore: 50,
            matchReason: `Top service specialist (${p.category})`,
            isTopCategory: true,
          });
        } else {
          remainingProviders.push({
            ...p,
            matchScore: 30,
            matchReason: `Featured Provider`,
            isTopCategory: false,
          });
        }
      }

      matchedProviders = [
        ...districtTopCategoryMatches,
        ...districtOtherMatches,
        ...otherDistrictTopCatMatches,
        ...remainingProviders,
      ];
    } else {
      // New Seeker with no bookings: Recommend all eligible verified providers in their district
      const districtMatches = [];
      const otherMatches = [];

      for (const p of eligibleProviders) {
        const pDistrict = (p.district || "").trim().toLowerCase();
        if (pDistrict === normalizedSeekerDistrict) {
          districtMatches.push({
            ...p,
            matchScore: 90,
            matchReason: `Top rated verified pro in ${p.district || seekerDistrict}`,
            isTopCategory: false,
          });
        } else {
          otherMatches.push({
            ...p,
            matchScore: 40,
            matchReason: `Verified Specialist`,
            isTopCategory: false,
          });
        }
      }

      matchedProviders = [...districtMatches, ...otherMatches];
    }

    // 7. Format output for Seeker Mobile App Carousel & Navigation
    const recommendations = matchedProviders.map((p, idx) => {
      const pId = p._id || p.id;
      const displayName = p.name || p.fullName || (p.email ? p.email.split("@")[0] : `Provider ${idx + 1}`);
      const categoryName = p.category || "General Services";
      const districtName = p.district || seekerDistrict;
      const realRating = p.computedRating || (p.rating ? Number(Number(p.rating).toFixed(1)) : 4.8);
      const totalReviews = p.computedReviewCount !== undefined ? p.computedReviewCount : (p.reviewCount || 14);

      return {
        id: String(pId),
        _id: String(pId),
        title: displayName,
        subtitle: `${categoryName} • ${districtName}`,
        category: categoryName,
        district: districtName,
        rating: realRating,
        reviewsCount: totalReviews,
        isVerified: Boolean(p.isVerified),
        matchReason: p.matchReason,
        matchScore: p.matchScore,
        isTopCategory: Boolean(p.isTopCategory),
        image: p.profileImage || null,
        provider: {
          id: String(pId),
          _id: String(pId),
          name: displayName,
          email: p.email,
          telephone: p.telephone,
          district: districtName,
          category: categoryName,
          profileImage: p.profileImage,
          bio: p.bio,
          isVerified: Boolean(p.isVerified),
          rating: realRating,
          location: p.location,
        },
        portfolio: {
          categories: [categoryName],
          specific_labels: [categoryName],
          images: p.profileImage ? [p.profileImage] : [],
          total_images: p.profileImage ? 1 : 0,
        },
        match: {
          category: categoryName,
          reason: p.matchReason,
          isTopCategory: Boolean(p.isTopCategory),
        },
      };
    });

    return res.status(200).json({
      success: true,
      seekerDistrict,
      isNewSeeker,
      topCategories,
      totalRecommendations: recommendations.length,
      recommendations,
    });
  } catch (error) {
    console.error("GET PROVIDER RECOMMENDATIONS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching recommendations",
      error: error.message,
    });
  }
};
export const getProviderRequestsbyProvider = async (req, res) => {
  try {
    const { providerId } = req.params;

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "Provider ID is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({ success: false, message: "Invalid provider ID" });
    }

    const requests = await RequestQuotation.find({
      $or: [
        { providerId },
        { providerId: new mongoose.Types.ObjectId(providerId) },
      ],
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Get provider requests error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch provider requests",
      error: error.message,
    });
  }
};
