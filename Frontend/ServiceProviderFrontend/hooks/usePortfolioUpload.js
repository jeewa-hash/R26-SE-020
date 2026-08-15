import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

export function usePortfolioUpload() {
  const [images, setImages] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTagScreen, setShowTagScreen] = useState(false);

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Permission to access gallery is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],   // ← fixed here
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setImages(result.assets);
      startProcessing();
    }
  };

  const startProcessing = () => {
    setProcessing(true);
    setProgress(0);

    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 12) + 5;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setTimeout(() => {
          setProcessing(false);
          setShowTagScreen(true);
        }, 500);
      }
      setProgress(current);
    }, 300);
  };

  const cancelProcessing = () => {
    setProcessing(false);
    setProgress(0);
    setImages([]);
  };

  const resetAll = () => {
    setImages([]);
    setProcessing(false);
    setProgress(0);
    setShowTagScreen(false);
  };

  return {
    images,
    processing,
    progress,
    showTagScreen,
    openGallery,
    cancelProcessing,
    resetAll,
  };
}