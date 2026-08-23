/**
 * controllers/adPostController.js
 * AI-assisted service post generation (FR-03) + post management (FR-16).
 */

import AdPost from "../models/AdPost.js";
import { generateAIContent } from "../services/geminiServices.js";
import {
  validateGenerateRequest,
  validateMLRequest,
  buildAdData,
  buildAdDataFromML,
} from "../utils/adPostHelpers.js";

// ── POST /api/ad/generate ───────────────────────────────────────────────
// Manual flow: provider types in service details directly.
export const generateManualPost = async (req, res) => {
  try {
    const errors = validateGenerateRequest(req.body);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const adData = buildAdData(req.body);
    const posts = await generateAIContent(adData);

    const saved = await AdPost.create({
      providerId: req.body.providerId,
      providerName: adData.providerName,
      location: adData.location,
      contact: adData.contact,
      serviceLabel: adData.serviceLabel,
      specificLabel: adData.specificLabel,
      category: adData.category,
      tags: adData.tags,
      tone: adData.tone,
      language: adData.language,
      extraInfo: adData.extraInfo,
      source: "manual",
      posts,
      image: {
        requested: adData.generateImage,
        url: null,
        note: adData.generateImage
          ? "Image generation is not implemented in this service yet"
          : null,
      },
    });

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── POST /api/ad/generate/ml ────────────────────────────────────────────
// ML flow: details are built from the Portfolio Classification model's
// output (FR-12/FR-13), so a provider can generate a post straight from
// an uploaded work photo instead of typing in service details.
export const generateFromMLResult = async (req, res) => {
  try {
    const errors = validateMLRequest(req.body);
    if (errors.length) {
      return res.status(400).json({ success: false, errors });
    }

    const adData = buildAdDataFromML(req.body.mlResult, req.body.providerInfo);
    const posts = await generateAIContent(adData);

    const saved = await AdPost.create({
      providerId: req.body.providerInfo.providerId,
      providerName: adData.providerName,
      location: adData.location,
      contact: adData.contact,
      serviceLabel: adData.serviceLabel,
      specificLabel: adData.specificLabel,
      category: adData.category,
      tags: adData.tags,
      tone: adData.tone,
      language: adData.language,
      extraInfo: adData.extraInfo,
      source: "ml",
      mlResult: req.body.mlResult,
      posts,
      image: {
        requested: adData.generateImage,
        url: null,
        note: adData.generateImage
          ? "Image generation is not implemented in this service yet"
          : null,
      },
    });

    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── POST /api/ad/:id/regenerate ─────────────────────────────────────────
// Regenerate posts for an existing entry — e.g. the provider wants a
// different tone or language, or wants to try again.
export const regeneratePost = async (req, res) => {
  try {
    const existing = await AdPost.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const adData = {
      providerName: existing.providerName,
      location: existing.location,
      contact: existing.contact,
      serviceLabel: existing.serviceLabel,
      specificLabel: existing.specificLabel,
      category: existing.category,
      tags: existing.tags,
      tone: req.body.tone || existing.tone,
      language: req.body.language || existing.language,
      extraInfo: req.body.extraInfo ?? existing.extraInfo,
      platforms: req.body.platforms || existing.posts.map((p) => p.platform),
    };

    const posts = await generateAIContent(adData);

    existing.posts = posts;
    existing.tone = adData.tone;
    existing.language = adData.language;
    existing.extraInfo = adData.extraInfo;
    await existing.save();

    res.json({ success: true, data: existing });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── GET /api/provider/ads/provider ─────────────────────────────────────
export const listPostsByProvider = async (req, res) => {
  try {
    const providerId = req.user?.id;
    if (!providerId) {
      return res.status(401).json({
        success: false,
        message: "Provider authentication required.",
      });
    }

    const posts = await AdPost.find({ providerId }).sort({
      createdAt: -1,
    });
    res.json({ success: true, count: posts.length, data: posts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── GET /api/ad/:id ──────────────────────────────────────────────────────
export const getPostById = async (req, res) => {
  try {
    const post = await AdPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    res.json({ success: true, data: post });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── PUT /api/ad/:id ──────────────────────────────────────────────────────
// Lets a provider manually edit a generated caption before publishing,
// or change its status.
export const updatePost = async (req, res) => {
  try {
    const allowedFields = ["posts", "status", "extraInfo", "tone"];
    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const post = await AdPost.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    res.json({ success: true, data: post });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── DELETE /api/ad/:id ───────────────────────────────────────────────────
export const deletePost = async (req, res) => {
  try {
    const post = await AdPost.findByIdAndDelete(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    res.json({ success: true, message: "Post deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
