/**
 * hooks/usePortfolioUpload.js
 *
 * Calls your existing Flask API (app.py) on port 5000.
 *
 * Flask endpoint:  POST /predict
 * Field name:      images  (not "files")
 * Flask response:  { rejected, images: [...], portfolio_summary }
 *
 * Each item in data.images from your predictor is mapped to the shape
 * PortfolioTagScreen expects: { uri, category, confidence, tags, passed, ... }
 *
 * Network setup:
 *   Android emulator → http://10.132.72.163:5000
 *   iOS simulator    → http://localhost:5000
 *   Real device      → http://<your-PC-LAN-IP>:5000  (run ipconfig to find it)
 */

import { useState, useRef, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

const API_BASE_URL = __DEV__
  ?  'http://10.132.72.163:5000'        // Android emulator — change to LAN IP for real device
  : 'https://your-production-api.com';

const MAX_IMAGES = 5;

// ─────────────────────────────────────────────────────────────────────────────
// Tag generation from your Flask response fields
// Your predictor returns label (key) + category — we map these to display tags.
// ─────────────────────────────────────────────────────────────────────────────

const LABEL_TAGS = {
  electrical_repair:            ['electrical', 'repaired', 'fixed', 'wiring', 'indoor'],
  plumbing_repair:              ['plumbing', 'pipe', 'fixed', 'leak-free', 'residential'],
  furniture_repair:             ['furniture', 'wood', 'repaired', 'restored', 'crafted'],
  roofing_repair:               ['roofing', 'tiles', 'waterproof', 'repaired', 'exterior'],
  painting_renovation:          ['painted', 'fresh-coat', 'walls', 'finish', 'interior'],
  house_cleaning:               ['clean', 'sanitized', 'spotless', 'after', 'deep-clean'],
  post_construction_cleaning:   ['construction', 'debris', 'clean', 'after', 'polished'],
  move_in_out_cleaning:         ['move-out', 'empty', 'clean', 'sanitized', 'ready'],
  sofa_carpet_curtain_cleaning: ['sofa', 'carpet', 'fabric', 'clean', 'stain-free'],
  garden_cleaning:              ['garden', 'clean', 'trimmed', 'leaves', 'cleared'],
  garden_maintenance:           ['garden', 'maintained', 'grass', 'hedge', 'neat'],
  landscaping_design:           ['landscaping', 'design', 'outdoor', 'aesthetic', 'garden'],
  planting:                     ['planting', 'plants', 'garden', 'green', 'outdoor'],
};

// Human-readable label from the key your Flask /services endpoint returns
const LABEL_DISPLAY = {
  electrical_repair:            'Electrical Repair',
  plumbing_repair:              'Plumbing Repair',
  furniture_repair:             'Furniture Repair',
  roofing_repair:               'Roofing Repair',
  painting_renovation:          'Painting & Renovation',
  house_cleaning:               'House Cleaning',
  post_construction_cleaning:   'Post-Construction Cleaning',
  move_in_out_cleaning:         'Move In/Out Cleaning',
  sofa_carpet_curtain_cleaning: 'Sofa/Carpet/Curtain Cleaning',
  garden_cleaning:              'Garden Cleaning',
  garden_maintenance:           'Garden Maintenance',
  landscaping_design:           'Landscaping & Design',
  planting:                     'Planting Services',
};

/**
 * Maps one item from data.images (Flask predictor output) to the shape
 * PortfolioTagScreen and PortfolioContext expect.
 *
 * We don't know the exact predictor.py output shape, so we handle
 * multiple common field names gracefully with fallbacks.
 */
function mapFlaskItemToPortfolio(flaskItem, originalImage) {
  // Your predictor likely returns one of these field names — handle all variants
  const labelKey   = flaskItem.label ?? flaskItem.class_key ?? flaskItem.predicted_class ?? 'other';
  const category   = flaskItem.label_display
                  ?? LABEL_DISPLAY[labelKey]
                  ?? flaskItem.category
                  ?? 'Unclassified';
  const confidence = flaskItem.confidence ?? flaskItem.score ?? 0;
  const rejected   = flaskItem.rejected ?? (labelKey === 'other') ?? false;
  const reason     = flaskItem.reason ?? flaskItem.rejection_reason ?? null;

  return {
    // From ImagePicker — always present
    uri:      originalImage.uri,
    width:    originalImage.width,
    height:   originalImage.height,
    fileName: originalImage.fileName,

    // From Flask predictor
    category,
    confidence:   parseFloat(confidence.toFixed(3)),
    tags:         rejected ? [] : (LABEL_TAGS[labelKey] ?? ['service', 'completed']),
    micro_skills: [],    // your predictor doesn't return micro-skills yet — empty for now
    passed:       !rejected,
    note:         rejected
                    ? (reason ?? 'This photo does not appear to show a home service. Please retake it.')
                    : null,
  };
}


export function usePortfolioUpload() {
  const [images,        setImages]        = useState([]);
  const [aiResults,     setAiResults]     = useState([]);
  const [processing,    setProcessing]    = useState(false);
  const [progress,      setProgress]      = useState(0);
  const [showTagScreen, setShowTagScreen] = useState(false);
  const [error,         setError]         = useState(null);

  const cancelledRef   = useRef(false);
  const progressTimers = useRef([]);

  // ── Animated progress bar (fills while waiting for Flask) ────────
  const startProgressAnimation = useCallback(() => {
    setProgress(0);
    cancelledRef.current = false;

    // Clear any previous timers
    progressTimers.current.forEach(clearTimeout);
    progressTimers.current = [];

    const steps = [
      { target: 12, delay: 300  },   // upload started
      { target: 35, delay: 1100 },   // images received by Flask
      { target: 58, delay: 2200 },   // model running
      { target: 80, delay: 1800 },   // almost done
    ];

    let cumulative = 0;
    steps.forEach(({ target, delay }) => {
      cumulative += delay;
      const id = setTimeout(() => {
        if (!cancelledRef.current) setProgress(target);
      }, cumulative);
      progressTimers.current.push(id);
    });
  }, []);

  const clearProgressTimers = useCallback(() => {
    progressTimers.current.forEach(clearTimeout);
    progressTimers.current = [];
  }, []);

  // ── Open gallery — pick up to 5 images ────────────────────────────
  const openGallery = useCallback(async () => {
    setError(null);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library in Settings.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:             ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection:true,
      selectionLimit:         MAX_IMAGES,
      quality:                0.85,
      exif:                   true,
    });

    if (result.canceled || !result.assets?.length) return;

    const selected = result.assets.slice(0, MAX_IMAGES);
    setImages(selected);
    await sendToFlask(selected);
  }, []);

  // ── POST to Flask /predict ─────────────────────────────────────────
  const sendToFlask = useCallback(async (selectedImages) => {
    setProcessing(true);
    startProgressAnimation();

    try {
      const formData = new FormData();

      // ⚠️  Flask field name is "images" (matches request.files.getlist("images"))
      selectedImages.forEach((img, index) => {
        formData.append('images', {
          uri:  img.uri,
          name: img.fileName ?? `photo_${index + 1}.jpg`,
          type: img.mimeType ?? 'image/jpeg',
        });
      });

      const response = await fetch(`${API_BASE_URL}/predict`, {
        method:  'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body:    formData,
      });

      if (cancelledRef.current) return;

      const data = await response.json();

      // Flask returns 422 + rejected:true when ALL images are irrelevant
      if (response.status === 422 || data.rejected === true) {
        const detail = data.detail ?? data.error ?? 'Please upload photos that show a home service.';
        throw new Error(detail);
      }

      if (!response.ok) {
        throw new Error(data.error ?? `Server error (${response.status})`);
      }

      // ── Map Flask items → PortfolioTagScreen shape ─────────────────
      // data.images is an array parallel to selectedImages
      const flaskItems = data.images ?? [];

      const enriched = selectedImages.map((img, index) => {
        const flaskItem = flaskItems[index];
        if (!flaskItem) {
          // Shouldn't happen — safety fallback
          return {
            uri: img.uri, width: img.width, height: img.height,
            fileName: img.fileName, category: 'Unclassified',
            confidence: 0, tags: [], micro_skills: [], passed: false,
            note: 'No result returned for this image.',
          };
        }
        return mapFlaskItemToPortfolio(flaskItem, img);
      });

      // ── Show alert for individually rejected images ────────────────
      const rejected = enriched.filter(e => !e.passed);
      if (rejected.length > 0 && rejected.length < enriched.length) {
        const names = rejected.map(r => `• ${r.fileName ?? 'photo'}: ${r.note}`).join('\n');
        Alert.alert(`${rejected.length} Photo(s) Not Usable`, names, [{ text: 'OK' }]);
      }

      // ── portfolio_summary — badge check ───────────────────────────
      const summary = data.portfolio_summary ?? {};
      if (summary.top_category && summary.image_count >= 3) {
        setTimeout(() => {
          Alert.alert(
            '🏆 Better Version Badge!',
            `AI detected you specialise in ${summary.top_category}. A badge will appear on your profile.`
          );
        }, 1500);
      }

      clearProgressTimers();
      setProgress(100);
      setAiResults(enriched);

      setTimeout(() => {
        if (!cancelledRef.current) {
          setProcessing(false);
          setShowTagScreen(true);
        }
      }, 600);

    } catch (err) {
      if (cancelledRef.current) return;
      clearProgressTimers();
      setProcessing(false);
      setProgress(0);
      setError(err.message);

      Alert.alert(
        'AI Processing Failed',
        err.message.includes('Network') || err.message.includes('fetch')
          ? `Cannot reach the server at ${API_BASE_URL}.\n\nCheck:\n• Flask is running (python app.py)\n• Your phone and PC are on the same WiFi\n• The IP address in API_BASE_URL is correct`
          : err.message,
        [{ text: 'OK' }]
      );
    }
  }, [startProgressAnimation, clearProgressTimers]);

  // ── Cancel ────────────────────────────────────────────────────────
  const cancelProcessing = useCallback(() => {
    cancelledRef.current = true;
    clearProgressTimers();
    setProcessing(false);
    setProgress(0);
    setImages([]);
    setAiResults([]);
  }, [clearProgressTimers]);

  // ── Reset after tag screen closes ─────────────────────────────────
  const resetAll = useCallback(() => {
    setImages([]);
    setAiResults([]);
    setProcessing(false);
    setProgress(0);
    setShowTagScreen(false);
    setError(null);
    cancelledRef.current = false;
    clearProgressTimers();
  }, [clearProgressTimers]);

  return {
    images,
    aiResults,
    processing,
    progress,
    showTagScreen,
    error,
    openGallery,
    cancelProcessing,
    resetAll,
  };
}