/**
 * services/geminiServices.js
 * Calls Gemini to generate structured, per-platform, multilingual ad posts.
 */

import axios from "axios";
import { buildPrompt } from "./promptService.js";

const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // doubles each attempt: 2s, 4s, 8s

const stripCodeFences = (text) =>
  text.replace(/```json/gi, "").replace(/```/g, "").trim();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryable = (status) => status === 429 || status === 503;

const callGemini = async (prompt) => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await axios.post(`${API_URL}?key=${process.env.GEMINI_API_KEY}`, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          responseMimeType: "application/json",
        },
      });
    } catch (err) {
      const status = err.response?.status;
      const apiMessage = err.response?.data?.error?.message;

      if (isRetryable(status) && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt;
        console.warn(
          `⚠️  Gemini overloaded (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms...`
        );
        await sleep(delay);
        continue;
      }

      throw new Error(apiMessage ? `Gemini API error: ${apiMessage}` : err.message);
    }
  }
};

export const generateAIContent = async (adData) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in environment variables");
  }

  const prompt = buildPrompt(adData);
  const response = await callGemini(prompt);

  const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error("Gemini returned no content");
  }

  let parsed;
  try {
    parsed = JSON.parse(stripCodeFences(rawText));
  } catch (err) {
    throw new Error(`Failed to parse Gemini response as JSON: ${err.message}`);
  }

  if (!parsed.posts || !Array.isArray(parsed.posts)) {
    throw new Error("Gemini response is missing a 'posts' array");
  }

  return parsed.posts.map((p) => ({
    platform: p.platform,
    title: p.title || "",
    caption: p.caption || "",
    hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
  }));
};