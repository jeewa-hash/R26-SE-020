import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

// The uploader and HTTP file server must use the same directory regardless of cwd.
// A deployed service can point UPLOAD_DIR at its persistent mounted volume.
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : fileURLToPath(new URL('../uploads/', import.meta.url));
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
export const publicImagePath = file => file?.filename ? `uploads/${file.filename}` : null;
export const storedImageFile = image => {
  if (typeof image !== 'string' || /^https?:/i.test(image)) return null;
  const normalized = image.replace(/\\/g, '/');
  if (!normalized.startsWith('uploads/') && !normalized.includes('/uploads/')) return null;
  return path.join(UPLOAD_DIR, path.basename(normalized));
};
