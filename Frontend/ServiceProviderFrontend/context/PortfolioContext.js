import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';

const PortfolioContext = createContext();

export function PortfolioProvider({ children }) {
  const [portfolioImages, setPortfolioImages] = useState([]);
  const [portfolioCategories, setPortfolioCategories] = useState([]);
  const [specialization, setSpecialization] = useState({ awarded: false });
  const [loading, setLoading] = useState(false);

  // Helper to resolve full image url
  const resolveImageUrl = (imgDoc) => {
    if (!imgDoc) return '';
    const raw = imgDoc.image_url || imgDoc.uri || '';
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('file://')) {
      return raw;
    }
    if (raw.startsWith('/uploads/')) {
      return `${CONFIG.ML_SERVICE_URL}${raw}`;
    }
    return raw;
  };

  // Fetch portfolio items and categories from ML Engine backend
  const loadPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setLoading(false);
        return;
      }

      // Fetch items
      const itemsRes = await fetch(`${CONFIG.ML_SERVICE_URL}/portfolio/items`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (itemsRes.ok) {
        const data = await itemsRes.json();
        const rawItems = data.items || [];
        const formatted = rawItems.map((item) => ({
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
          quality: item.quality || { label: 'Good Quality', color: 'green' },
          tags: Array.isArray(item.tags) ? item.tags : [],
          clip_matches: item.clip_matches || [],
          uploadedAt: item.created_at || new Date().toISOString(),
        }));
        setPortfolioImages(formatted);
      }

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

