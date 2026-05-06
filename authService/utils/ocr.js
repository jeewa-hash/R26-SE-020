const { createWorker } = require('tesseract.js');
const path = require('path');
const fs = require('fs');

/**
 * Try to extract NIC patterns from OCR text.
 * @param {string} text - Raw OCR text
 * @returns {string|null} - Extracted NIC or null
 */
function extractNicFromText(text) {
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
  const noSpaceText = text.replace(/\s/g, '');

  // Old format: 9 digits followed by V or X
  const oldFormatMatch = cleanText.match(/\b\d{9}[VvXx]\b/);
  if (oldFormatMatch) {
    return { value: oldFormatMatch[0].toUpperCase(), source: 'old-format' };
  }

  // New format: 12 digits (with word boundaries in spaced text)
  const newFormatMatch = cleanText.match(/\b\d{12}\b/);
  if (newFormatMatch) {
    return { value: newFormatMatch[0], source: 'new-format-spaced' };
  }

  // Also search in no-space text (handles cases where digits are split by whitespace)
  const noSpaceMatch = noSpaceText.match(/\d{12}/);
  if (noSpaceMatch) {
    return { value: noSpaceMatch[0], source: 'new-format-no-space' };
  }

  // Fallback: look for any 10-12 char alphanumeric that looks like NIC
  const fallbackMatch = cleanText.match(/\b\d{8,12}[A-Za-z]?\b/);
  if (fallbackMatch) {
    return { value: fallbackMatch[0].toUpperCase(), source: 'fallback' };
  }

  return null;
}

/**
 * Run OCR with specific parameters.
 * @param {string} absolutePath - Absolute image path
 * @param {Object} params - Tesseract parameters
 * @returns {Promise<string>} - OCR text
 */
async function runOcr(absolutePath, params = {}) {
  const worker = await createWorker('eng');
  if (Object.keys(params).length > 0) {
    await worker.setParameters(params);
  }
  const { data: { text } } = await worker.recognize(absolutePath);
  await worker.terminate();
  return text;
}

/**
 * Extract NIC number from an image using Tesseract.js OCR.
 * Supports Sri Lankan NIC formats:
 * - Old: 9 digits + V/X (e.g., 8802450123V)
 * - New: 12 digits (e.g., 198802450123)
 *
 * Uses multiple OCR strategies to handle poor-quality images:
 * 1. Standard OCR with default settings
 * 2. Digit whitelist with PSM 3 (fully automatic page segmentation)
 * 3. Digit whitelist with PSM 11 (sparse text - find as much text as possible)
 *
 * @param {string} imagePath - Relative or absolute path to the image
 * @returns {Promise<string|null>} - Extracted NIC number or null
 */
async function extractNicFromImage(imagePath) {
  try {
    // Resolve absolute path if relative
    const absolutePath = path.isAbsolute(imagePath)
      ? imagePath
      : path.resolve(process.cwd(), imagePath);

    console.log('[OCR] Resolved image path:', absolutePath);

    // Verify file exists
    if (!fs.existsSync(absolutePath)) {
      console.error('[OCR] Image file not found:', absolutePath);
      return null;
    }

    // Strategy 1: Standard OCR (default settings)
    console.log('[OCR] Strategy 1: Standard OCR...');
    const standardText = await runOcr(absolutePath);
    console.log('[OCR] Standard text:', standardText.substring(0, 200));
    const standardResult = extractNicFromText(standardText);
    if (standardResult) {
      console.log('[OCR] Strategy 1 success:', standardResult.value, `(${standardResult.source})`);
      return standardResult.value;
    }

    // Strategy 2: Digit whitelist + PSM 3
    console.log('[OCR] Strategy 2: Digit whitelist + PSM 3...');
    const psm3Text = await runOcr(absolutePath, {
      tessedit_char_whitelist: '0123456789',
      tessedit_pageseg_mode: '3',
    });
    console.log('[OCR] PSM 3 text:', psm3Text.substring(0, 200));
    const psm3Result = extractNicFromText(psm3Text);
    if (psm3Result) {
      console.log('[OCR] Strategy 2 success:', psm3Result.value, `(${psm3Result.source})`);
      return psm3Result.value;
    }

    // Strategy 3: Digit whitelist + PSM 11 (sparse text)
    console.log('[OCR] Strategy 3: Digit whitelist + PSM 11...');
    const psm11Text = await runOcr(absolutePath, {
      tessedit_char_whitelist: '0123456789',
      tessedit_pageseg_mode: '11',
    });
    console.log('[OCR] PSM 11 text:', psm11Text.substring(0, 200));
    const psm11Result = extractNicFromText(psm11Text);
    if (psm11Result) {
      console.log('[OCR] Strategy 3 success:', psm11Result.value, `(${psm11Result.source})`);
      return psm11Result.value;
    }

    console.log('[OCR] All strategies failed. No NIC pattern found.');
    return null;
  } catch (err) {
    console.error('[OCR] Error processing image:', err.message);
    return null;
  }
}

module.exports = { extractNicFromImage };
