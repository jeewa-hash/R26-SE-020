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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';

const MAX_IMAGES = 5;

// Human-readable label fallback from the key
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
 */
function mapFlaskItemToPortfolio(flaskItem, originalImage) {
  const labelKey = flaskItem.service ?? flaskItem.label_key ?? flaskItem.label ?? 'other';
  const label = flaskItem.label ?? LABEL_DISPLAY[labelKey] ?? 'Service Work';
  const category = flaskItem.category ?? flaskItem.category_group ?? 'General';
  const confidence = typeof flaskItem.confidence === 'number' ? flaskItem.confidence : 0;
  const clipConfidence = typeof flaskItem.clip_confidence === 'number' ? flaskItem.clip_confidence : 0;
  const rejected = flaskItem.rejected ?? false;
  const reason = flaskItem.reason ?? flaskItem.error ?? null;

  return {
    id: flaskItem.id ?? flaskItem._id ?? `${Date.now()}_${Math.random()}`,
    uri: originalImage.uri,
    width: originalImage.width,
    height: originalImage.height,
    fileName: originalImage.fileName,
    image_url: flaskItem.image_url ?? '',

    service: labelKey,
    label: label,
    category: category,
    category_group: category,
    specific_label: flaskItem.specific_label ?? label,
    confidence: parseFloat(confidence.toFixed(1)),
    clip_confidence: parseFloat(clipConfidence.toFixed(1)),
    quality: flaskItem.quality ?? { label: confidence >= 80 ? 'High Quality' : 'Good Quality', color: confidence >= 80 ? 'green' : 'amber' },
    tags: rejected ? [] : (Array.isArray(flaskItem.tags) ? flaskItem.tags : []),
    clip_matches: flaskItem.clip_matches ?? [],
    passed: !rejected,
    note: rejected ? (reason ?? 'This photo does not appear to show a home service. Please retake it.') : null,
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

      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('Please log in again. Authorization token is missing.');
      }

      const response = await fetch(`${CONFIG.ML_SERVICE_URL}/predict`, {
        method:  'POST',
        headers: {
          // Flask ML middleware requires Bearer token
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (cancelledRef.current) return;

      const data = await response.json();

      // Flask returns 422 + rejected:true when ALL images are irrelevant
      if (response.status === 422 || data.rejected === true) {
        const detail = data.detail ?? data.error ?? data.reason ?? 'Please upload photos that show a home service.';
        throw new Error(detail);
      }

      if (!response.ok) {
        throw new Error(data.error ?? `Server error (${response.status})`);
      }

      // ── Map Flask items → PortfolioTagScreen shape ─────────────────
      const flaskItems = data.images ?? [];

      const enriched = selectedImages.map((img, index) => {
        const flaskItem = flaskItems[index];
        if (!flaskItem) {
          return {
            id: `${Date.now()}_${index}`,
            uri: img.uri, width: img.width, height: img.height,
            fileName: img.fileName, category: 'Unclassified',
            label: 'Service Work', specific_label: 'Service Work',
            confidence: 0, clip_confidence: 0, quality: { label: 'Needs Review', color: 'red' },
            tags: [], passed: false,
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
      setImages(enriched);

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
          ? `Cannot reach the server at ${CONFIG.ML_SERVICE_URL}.\n\nCheck:\n• ML Engine is running on port 5000\n• IP address is configured correctly in config.js`
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
