// Mobile connections and ALB requests may take longer than a local LAN request.
export const PROVIDER_REQUEST_TIMEOUT_MS = 15000;

export async function fetchProviderWithTimeout(url, options = {}, timeoutMs = PROVIDER_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      const timeout = new Error(`The server did not respond within ${Math.ceil(timeoutMs / 1000)} seconds. Check your connection and that the backend is running, then retry.`);
      timeout.code = 'REQUEST_TIMEOUT';
      throw timeout;
    }
    throw error;
  } finally { clearTimeout(timer); }
}
