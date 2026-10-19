export async function fetchSeekerWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), !options.method || options.method === 'GET' ? 15000 : 90000);
  try {
    return await globalThis.fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new Error('The service took too long to respond. Check your connection and refresh to try again.');
    throw error;
  } finally { clearTimeout(timer); }
}
