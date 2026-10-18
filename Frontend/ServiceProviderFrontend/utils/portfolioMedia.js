export function resolvePortfolioImage(raw, origin) {
  if (!raw || typeof raw !== 'string') return null;
  if (/^(https?:|file:|content:|blob:|data:image\/)/i.test(raw)) return raw;
  const normalized = raw.replace(/\\/g, '/').replace(/^\/+/, '');
  // Old placeholder paths are not bundled assets; use the existing category icon.
  if (/^(?:\.\/)?assets\//i.test(normalized)) return null;
  return new URL(normalized, `${origin.replace(/\/+$/, '')}/`).toString();
}
