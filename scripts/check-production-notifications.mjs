// Read-only diagnostics: this never publishes a notification or modifies accounts.
const secret = process.env.NOTIFICATION_SERVICE_SECRET;
const auth = (process.env.AUTH_SERVICE_URL || 'https://r26-auth-service.onrender.com').replace(/\/$/, '');
const targets = [
  ['auth hub', `${auth}/internal/notifications/health`],
  ['seeker publisher', `${(process.env.SEEKER_SERVICE_URL || 'https://r26-se-020-production-db02.up.railway.app').replace(/\/$/, '')}/health/notifications`],
  ['provider publisher', `${(process.env.PROVIDER_SERVICE_URL || 'https://r26-se-020-production.up.railway.app').replace(/\/$/, '')}/health/notifications`],
  ['coordination publisher', `${(process.env.COORDINATION_SERVICE_URL || 'http://k8s-default-coordina-f35bbe8d02-1683340780.ap-southeast-2.elb.amazonaws.com').replace(/\/$/, '')}/health/notifications`],
];
if (!secret) { console.error('Set NOTIFICATION_SERVICE_SECRET securely in the environment before running diagnostics.'); process.exit(1); }
await Promise.all(targets.map(async ([name, url]) => {
  try {
    const endpoint = new URL(url);
    if (endpoint.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(endpoint.hostname)) {
      console.log(JSON.stringify({ service: name, healthy: false, error: 'Protected health checks require HTTPS or a local kubectl port-forward' }));
      process.exitCode = 1; return;
    }
    const response = await fetch(url, { headers: { 'x-notification-secret': secret }, signal: AbortSignal.timeout(45000) });
    const body = await response.json().catch(() => ({}));
    const healthy = response.ok && body.configured && body.databaseReady && (name === 'auth hub' ? body.socketReady : body.workerStarted);
    const result = { service: name, httpStatus: response.status, healthy: Boolean(healthy) };
    if (Number.isInteger(body.pending)) result.pending = body.pending;
    if (Number.isInteger(body.failed)) result.failed = body.failed;
    console.log(JSON.stringify(result));
    if (!healthy || body.failed > 0) process.exitCode = 1;
  } catch { console.log(JSON.stringify({ service: name, healthy: false, error: 'Connection failed or timed out' })); process.exitCode = 1; }
}));
