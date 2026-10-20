import { resolvePortfolioImage } from '../utils/portfolioMedia';
import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';
import { servicesAPI } from '../services/api';

const PortfolioContext = createContext();

export function PortfolioProvider({ children }) {
  const [portfolioImages, setPortfolioImages] = useState([]);
  const [portfolioCategories, setPortfolioCategories] = useState([]);
  const [specialization, setSpecialization] = useState({ awarded: false });
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, aiAnalyzed: 0, manual: 0 });

  // Helper to resolve full image url
  const resolveImageUrl = imgDoc => resolvePortfolioImage(imgDoc?.image_url || imgDoc?.uri || imgDoc?.url, CONFIG.ML_SERVICE_URL);

  // Fetch portfolio items and categories from ML Engine backend
  const loadPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setLoading(false);
        return;
      }

      let formatted = [];

      // Fetch items from ML Engine
      try {
        const itemsRes = await fetch(`${CONFIG.ML_SERVICE_URL}/portfolio/items`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (itemsRes.ok) {
          const data = await itemsRes.json();
          const rawItems = data.items || [];
          formatted = rawItems.map((item) => {
            const isAi = item.ai_analyzed !== false && (item.ai_analyzed === true || Number(item.confidence) > 0);
            return {
              id: item._id || item.id,
              uri: resolveImageUrl(item),
              image_url: item.image_url,
              service: item.service_key,
              service_key: item.service_key,
              label: item.label || 'Service',
              specific_label: item.specific_label || item.label || 'Service Work',
              category: item.category_group || item.category || 'General',
              category_group: item.category_group || item.category || 'General',
              confidence: item.confidence || 0,
              clip_confidence: item.clip_confidence || 0,
              quality: item.quality || { label: isAi ? 'AI Analyzed' : 'Manual Upload', color: isAi ? 'green' : 'blue' },
              tags: Array.isArray(item.tags) ? item.tags : [],
              clip_matches: item.clip_matches || [],
              ai_analyzed: isAi,
              isAiAnalyzed: isAi,
              source: item.source || 'portfolio',
              uploadedAt: item.created_at || new Date().toISOString(),
            };
          });
        }
      } catch (mlErr) {
        console.log('Error fetching ML portfolio items:', mlErr.message);
      }

      // Also merge any images saved under provider services
      try {
        const svcRes = await servicesAPI.getProviderServices();
        const servicesList = svcRes.data?.data || [];
        servicesList.forEach((svc) => {
          if (Array.isArray(svc.images)) {
            svc.images.forEach((img, idx) => {
              const rawUrl = typeof img === 'string' ? img : (img.url || img.image_url || img.uri);
              if (!rawUrl) return;
              const resolved = resolveImageUrl({ image_url: rawUrl, uri: rawUrl, url: rawUrl });
              const alreadyExists = formatted.some((f) =>
                f.image_url === rawUrl || f.uri === resolved || (typeof img === 'object' && img.id && f.id === img.id)
              );
              if (!alreadyExists) {
                const isAi = typeof img === 'object' ? Boolean(img.isAiAnalyzed || img.ai_analyzed || img.confidence > 0) : false;
                const conf = typeof img === 'object' ? (Number(img.confidence) || 0) : 0;
                const tags = (typeof img === 'object' && Array.isArray(img.tags) && img.tags.length > 0)
                  ? img.tags
                  : (Array.isArray(svc.tags) ? svc.tags : []);

                formatted.push({
                  id: (typeof img === 'object' && img.id) ? img.id : `svc_${svc._id}_${idx}`,
                  uri: resolved,
                  image_url: rawUrl,
                  service: svc.categoryGroup || svc.category || 'Service',
                  service_key: svc.categoryGroup || svc.category || 'service',
                  label: (typeof img === 'object' && img.label) || svc.name || 'Service Work',
                  specific_label: (typeof img === 'object' && (img.specificLabel || img.specific_label)) || svc.name,
                  category: svc.category || 'General',
                  category_group: svc.categoryGroup || 'General',
                  confidence: conf,
                  clip_confidence: 0,
                  quality: { label: isAi ? 'AI Analyzed' : 'Manual Upload', color: isAi ? 'green' : 'blue' },
                  tags: tags,
                  clip_matches: [],
                  ai_analyzed: isAi,
                  isAiAnalyzed: isAi,
                  source: 'service',
                  serviceId: svc._id,
                  uploadedAt: (typeof img === 'object' && img.uploadedAt) || svc.updatedAt || svc.createdAt || new Date().toISOString(),
                });
              }
            });
          }
        });
      } catch (svcErr) {
        console.log('Error merging service images into portfolio:', svcErr.message);
      }

      setPortfolioImages(formatted);
      const aiCount = formatted.filter((img) => img.ai_analyzed || img.isAiAnalyzed).length;
      setStats({
        total: formatted.length,
        aiAnalyzed: aiCount,
        manual: formatted.length - aiCount,
      });

      // Fetch categories summary
      const catRes = await fetch(`${CONFIG.ML_SERVICE_URL}/portfolio/categories`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (catRes.ok) {
        const catData = await catRes.json();
        setPortfolioCategories(catData.categories || []);
        if (catData.specialization) {
          setSpecialization(catData.specialization);
        }
      }
    } catch (err) {
      console.log('PortfolioContext loadPortfolio error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  // Save local images (after upload/tagging screen)
  const saveImages = useCallback((images, tagMap = {}) => {
    const newImages = images.map((img) => ({
      id: img.id || `${img.uri}_${Date.now()}_${Math.random()}`,
      uri: img.uri,
      image_url: img.image_url || '',
      label: img.label || 'Service',
      specific_label: img.specific_label || img.label || 'Service Work',
      category: img.category || 'General',
      category_group: img.category_group || img.category || 'General',
      confidence: img.confidence || 0,
      tags: tagMap[img.uri] || img.tags || [],
      uploadedAt: new Date().toISOString(),
    }));

    setPortfolioImages((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const filtered = newImages.filter((n) => !existingIds.has(n.id));
      return [...filtered, ...prev];
    });

    // Refresh from backend to sync newly saved ids and categories
    setTimeout(() => {
      loadPortfolio();
    }, 1000);
  }, [loadPortfolio]);

  const saveRemoteImages = useCallback((images) => {
    setPortfolioImages(images);
  }, []);

  // Get all unique tags across all images
  const getAllTags = useCallback(() => {
    const tagSet = new Set();
    portfolioImages.forEach((img) => {
      if (Array.isArray(img.tags)) {
        img.tags.forEach((tag) => {
          if (tag) tagSet.add(tag);
        });
      }
    });
    return Array.from(tagSet);
  }, [portfolioImages]);

  // Get images by tag
  const getImagesByTag = useCallback((tag) => {
    if (tag === 'All') return portfolioImages;
    return portfolioImages.filter((img) => Array.isArray(img.tags) && img.tags.includes(tag));
  }, [portfolioImages]);

  // Delete image locally and on ML Engine backend
  const deleteImage = useCallback(async (imageId) => {
    setPortfolioImages((prev) => prev.filter((img) => img.id !== imageId));

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token && imageId) {
        await fetch(`${CONFIG.ML_SERVICE_URL}/portfolio/items/${imageId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (err) {
      console.log('Error deleting portfolio item from backend:', err);
    }
  }, []);

  // Update tags for an image locally and on ML Engine backend
  const updateImageTags = useCallback(async (imageId, newTags) => {
    setPortfolioImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, tags: newTags } : img))
    );

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token && imageId) {
        await fetch(`${CONFIG.ML_SERVICE_URL}/portfolio/items/${imageId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ tags: newTags }),
        });
      }
    } catch (err) {
      console.log('Error updating portfolio item tags on backend:', err);
    }
  }, []);

  return (
    <PortfolioContext.Provider value={{
      portfolioImages,
      portfolioCategories,
      specialization,
      loading,
      stats,
      loadPortfolio,
      saveImages,
      saveRemoteImages,
      getAllTags,
      getImagesByTag,
      deleteImage,
      updateImageTags,
    }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export const usePortfolio = () => useContext(PortfolioContext);

