import React, { createContext, useState, useContext, useCallback } from 'react';

const PortfolioContext = createContext();

export function PortfolioProvider({ children }) {
  const [portfolioImages, setPortfolioImages] = useState([]);

  // Save images with their accepted tags
  const saveImages = useCallback((images, tagMap) => {
    const newImages = images.map((img) => ({
      id: `${img.uri}_${Date.now()}_${Math.random()}`,
      uri: img.uri,
      tags: tagMap[img.uri] || [],
      uploadedAt: new Date().toISOString(),
    }));

    setPortfolioImages((prev) => [...prev, ...newImages]);
  }, []);

  // Get all unique tags across all images
  const getAllTags = useCallback(() => {
    const tagSet = new Set();
    portfolioImages.forEach((img) => img.tags.forEach((tag) => tagSet.add(tag)));
    return Array.from(tagSet);
  }, [portfolioImages]);

  // Get images by tag
  const getImagesByTag = useCallback((tag) => {
    return portfolioImages.filter((img) => img.tags.includes(tag));
  }, [portfolioImages]);

  // Delete image
  const deleteImage = useCallback((imageId) => {
    setPortfolioImages((prev) => prev.filter((img) => img.id !== imageId));
  }, []);

  // Update tags for an image
  const updateImageTags = useCallback((imageId, newTags) => {
    setPortfolioImages((prev) =>
      prev.map((img) => img.id === imageId ? { ...img, tags: newTags } : img)
    );
  }, []);

  return (
    <PortfolioContext.Provider value={{
      portfolioImages,
      saveImages,
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