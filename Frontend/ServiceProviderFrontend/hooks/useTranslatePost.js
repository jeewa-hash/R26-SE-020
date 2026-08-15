import { useState } from 'react';
import axios from 'axios';

export function useTranslatePost(sourceLang) {
  const [translated, setTranslated] = useState(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [loading, setLoading] = useState(false);

  const targetLang = sourceLang === 'si' ? 'en' : 'si';

  const handleTranslate = async (text) => {
    if (translated && !showOriginal) { setShowOriginal(true); return; }
    if (translated && showOriginal) { setShowOriginal(false); return; }

    setLoading(true);
    try {
      const res = await axios.get(
        'https://translate.googleapis.com/translate_a/single',
        {
          params: {
            client: 'gtx',
            sl: sourceLang,
            tl: targetLang,
            dt: 't',
            q: text,
          },
        }
      );
      setTranslated(res.data[0][0][0]);
      setShowOriginal(false);
    } catch {
      setTranslated(null);
    }
    setLoading(false);
  };

  const displayText = (originalText) =>
    translated && !showOriginal ? translated : originalText;

  const isTranslated = translated && !showOriginal;

  return {
    displayText,
    handleTranslate,
    loading,
    isTranslated,
    targetLang,
  };
}