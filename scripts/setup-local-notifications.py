"""Configure local notification testing without changing production defaults or EAS settings."""
import argparse
import json
import os
from pathlib import Path
import secrets

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--host', required=True, help='Laptop LAN IP reachable by Expo devices')
args = parser.parse_args()
if any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-:' for c in args.host):
    raise SystemExit('Invalid local host')

def read_env(path):
    if not path.exists(): return {}
    values = {}
    for line in path.read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            key, value = line.split('=', 1)
            values[key.strip()] = value.strip().strip('\"\'')
    return values

def update_env(relative, changes):
    path = root / relative
    lines = path.read_text().splitlines() if path.exists() else []
    output, written = [], set()
    for line in lines:
        key = line.split('=', 1)[0].strip() if '=' in line and not line.lstrip().startswith('#') else None
        if key in changes:
            if key not in written: output.append(f'{key}={changes[key]}'); written.add(key)
        else: output.append(line)
    output += [f'{key}={value}' for key, value in changes.items() if key not in written]
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as file: file.write('\n'.join(output) + '\n')
    os.chmod(path, 0o600)

auth = read_env(root / 'authService/.env')
if not auth.get('JWT_SECRET'): raise SystemExit('Configure the local authService JWT_SECRET before testing.')
# Use a separate local delivery key instead of reusing the production publishing key.
local_keys = root / '.local-build' / 'local-notifications.env'
local_keys.parent.mkdir(parents=True, exist_ok=True)
local = read_env(local_keys)
notification_secret = local.get('NOTIFICATION_SERVICE_SECRET') or secrets.token_hex(32)
fd = os.open(local_keys, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd, 'w') as file: file.write('NOTIFICATION_SERVICE_SECRET=' + notification_secret + '\n')
os.chmod(local_keys, 0o600)
reward_secret = read_env(root / 'Seeker_Service/.env').get('REWARD_SERVICE_KEY') or secrets.token_hex(32)
common = {'NODE_ENV': 'development', 'AUTH_SERVICE_URL': 'http://127.0.0.1:4003', 'NOTIFICATION_SERVICE_SECRET': notification_secret, 'JWT_SECRET': auth['JWT_SECRET']}
update_env('authService/.env', {**common, 'PORT': '4003', 'COORDINATION_SERVICE_URL': 'http://127.0.0.1:5010'})
update_env('Seeker_Service/.env', {**common, 'PORT': '6000', 'PROVIDER_SERVICE_URL': 'http://127.0.0.1:3002', 'SERVICE_COORDINATION_URL': 'http://127.0.0.1:5010', 'REWARD_SERVICE_KEY': reward_secret})
update_env('Provider_Service/Backend/.env', {**common, 'PORT': '3002', 'SEEKER_SERVICE_URL': 'http://127.0.0.1:6000', 'SEEKER_SERVICE_BASE_URL': 'http://127.0.0.1:6000', 'PROVIDER_SERVICE_BASE_URL': 'http://127.0.0.1:3002', 'COORDINATION_SERVICE_URL': 'http://127.0.0.1:5010'})
update_env('ServiceCoordinationService/.env', {**common, 'PORT': '5010', 'SEEKER_SERVICE_URL': 'http://127.0.0.1:6000', 'SEEKER_SERVICE_BASE_URL': 'http://127.0.0.1:6000', 'PROVIDER_SERVICE_BASE_URL': 'http://127.0.0.1:3002', 'ML_SERVICE_URL': 'http://127.0.0.1:8001', 'ML_SERVICE_BASE_URL': 'http://127.0.0.1:8001', 'SERVICE_COORDINATION_SERVICE': 'http://127.0.0.1:5010', 'REWARD_SERVICE_KEY': reward_secret})
public = {
    'EXPO_PUBLIC_API_HOST': args.host,
    'EXPO_PUBLIC_AUTH_SERVICE_URL': f'http://{args.host}:4003',
    'EXPO_PUBLIC_SEEKER_SERVICE_URL': f'http://{args.host}:6000',
    'EXPO_PUBLIC_API_BASE_URL': f'http://{args.host}:6000',
    'EXPO_PUBLIC_PROVIDER_SERVICE_URL': f'http://{args.host}:3002',
    'EXPO_PUBLIC_PROVIDER_SERVICE_API_URL': f'http://{args.host}:3002',
    'EXPO_PUBLIC_COORDINATION_API_URL': f'http://{args.host}:5010',
}
for app in ['Seeker_Mobile_App', 'ServiceProviderFrontend']:
    update_env(f'Frontend/{app}/.env.local', public)
print(json.dumps({'host': args.host, 'ports': {'auth': 4003, 'seeker': 6000, 'provider': 3002, 'coordination': 5010}, 'notificationSecretsAligned': True, 'productionDefaultsChanged': False}))
print('Restart the four local backends and restart Expo with --clear in each app.')
