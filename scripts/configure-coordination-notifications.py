"""Apply only EKS notification configuration. Never print secret contents."""
import base64
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parent.parent
private = root / '.local-build' / 'production-notifications.env'
if not private.exists():
    raise SystemExit('Private production notification configuration is missing.')
values = dict(line.split('=', 1) for line in private.read_text().splitlines() if '=' in line and not line.startswith('#'))
secret = values.get('NOTIFICATION_SERVICE_SECRET', '')
origin = values.get('AUTH_SERVICE_URL', '')
if len(secret) < 32 or not origin.startswith('https://'):
    raise SystemExit('Production notification configuration is invalid.')

def patch(kind, name, content, strategy):
    result = subprocess.run(['kubectl', 'patch', kind, name, '--type', strategy, '--patch-file', '/dev/stdin', '--request-timeout=30s'], input=json.dumps(content), capture_output=True, text=True)
    if result.returncode:
        # kubectl validation errors can echo submitted values. Do not print raw stderr.
        raise SystemExit(f'Unable to update {kind}/{name}. Check cluster access and permissions; secret contents were not logged.')
    print(f'Updated {kind}/{name} notification configuration.')

patch('secret', 'coordination-secrets', {'data': {'NOTIFICATION_SERVICE_SECRET': base64.b64encode(secret.encode()).decode()}}, 'merge')
patch('deployment', 'coordination-service', {'spec': {'template': {'spec': {'containers': [{'name': 'coordination-service', 'env': [
    {'name': 'AUTH_SERVICE_URL', 'value': origin},
    {'name': 'NOTIFICATION_SERVICE_SECRET', 'valueFrom': {'secretKeyRef': {'name': 'coordination-secrets', 'key': 'NOTIFICATION_SERVICE_SECRET'}}},
]}]}}}}, 'strategic')
result = subprocess.run(['kubectl', 'rollout', 'status', 'deployment/coordination-service', '--timeout=120s'], capture_output=True, text=True)
print('Coordination rollout complete.' if result.returncode == 0 else 'Configuration saved. Rollout still needs verification.')
