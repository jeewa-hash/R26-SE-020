export function resolvePostImageUrl(value, origin) {
  const raw = typeof value === 'string' ? value : value?.url || value?.uri || value?.path;
  if (!raw) return null;
  if (/^(https?:|file:|content:|blob:|data:image\/)/i.test(raw)) return raw;
  let path = raw.replace(/\\/g, '/');
  const uploadIndex = path.lastIndexOf('/uploads/');
  if (uploadIndex >= 0) path = path.slice(uploadIndex + 1);
  return new URL(path.replace(/^\/+/, ''), `${origin.replace(/\/+$/, '')}/`).toString();
}

export async function appendPostImage(form, asset, platform, fetchFile = globalThis.fetch) {
  if (!asset?.uri) throw new Error('Select a photo before uploading.');
  const name = asset.fileName || 'post.jpg';
  if (platform === 'web') {
    const file = asset.file || await (await fetchFile(asset.uri)).blob();
    if (!file.size) throw new Error('The selected photo is empty. Please select it again.');
    form.append('image', file, name);
  } else {
    form.append('image', { uri: asset.uri, type: asset.mimeType || 'image/jpeg', name });
  }
}
