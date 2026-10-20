"""Restore hosted service configuration. Admin configuration is intentionally untouched."""
import json
import os
from pathlib import Path

root = Path(__file__).resolve().parent.parent
auth = 'https://r26-auth-service.onrender.com'
seeker = 'https://r26-se-020-production-db02.up.railway.app'
provider = 'https://r26-se-020-production.up.railway.app'
coordination = 'http://k8s-default-coordina-f35bbe8d02-1683340780.ap-southeast-2.elb.amazonaws.com'

def update_env(relative, changes, remove=()):
    path = root / relative
    lines = path.read_text().splitlines() if path.exists() else []
    output, written = [], set()
    for line in lines:
        key = line.split('=', 1)[0].strip() if '=' in line and not line.lstrip().startswith('#') else None
        if key in remove: continue
        if key in changes:
            if key not in written: output.append(f'{key}={changes[key]}'); written.add(key)
        else: output.append(line)
    output += [f'{key}={value}' for key, value in changes.items() if key not in written]
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as file: file.write('\n'.join(output) + '\n')
    os.chmod(path, 0o600)

common = {'NODE_ENV': 'production', 'AUTH_SERVICE_URL': auth}
private = root / '.local-build/production-notifications.env'
if private.exists():
    for line in private.read_text().splitlines():
        if line.startswith('NOTIFICATION_SERVICE_SECRET='):
            common['NOTIFICATION_SERVICE_SECRET'] = line.split('=', 1)[1].strip()
update_env('authService/.env', {**common, 'PORT': '4003', 'COORDINATION_SERVICE_URL': coordination})
update_env('Seeker_Service/.env', {**common, 'PORT': '6000', 'PROVIDER_SERVICE_URL': provider, 'SERVICE_COORDINATION_URL': coordination})
update_env('Provider_Service/Backend/.env', {**common, 'PORT': '3002', 'SEEKER_SERVICE_URL': seeker, 'SEEKER_SERVICE_BASE_URL': seeker, 'PROVIDER_SERVICE_BASE_URL': provider, 'COORDINATION_SERVICE_URL': coordination})
update_env('ServiceCoordinationService/.env', {**common, 'PORT': '5010', 'SEEKER_SERVICE_URL': seeker, 'SEEKER_SERVICE_BASE_URL': seeker, 'PROVIDER_SERVICE_BASE_URL': provider, 'SERVICE_COORDINATION_SERVICE': coordination, 'ADMIN_SERVICE_URL': 'https://r26-admin-service.onrender.com', 'ML_SERVICE_URL': 'http://duration-ml-service:8001', 'ML_SERVICE_BASE_URL': 'http://duration-ml-service:8001'})
public = {
    'EXPO_PUBLIC_AUTH_SERVICE_URL': auth,
    'EXPO_PUBLIC_SEEKER_SERVICE_URL': seeker,
    'EXPO_PUBLIC_API_BASE_URL': seeker,
    'EXPO_PUBLIC_PROVIDER_SERVICE_URL': provider,
    'EXPO_PUBLIC_PROVIDER_SERVICE_API_URL': provider,
    'EXPO_PUBLIC_COORDINATION_API_URL': coordination,
}
for app in ['Seeker_Mobile_App', 'ServiceProviderFrontend']:
    update_env(f'Frontend/{app}/.env.local', public, remove=['EXPO_PUBLIC_API_HOST'])
print(json.dumps({'mode': 'production', 'seekerPort': 6000, 'mobileApps': 'hosted services', 'adminChanged': False, 'credentialsPrinted': False}))
print('This updates local configuration only. It does not deploy code or change hosting dashboard variables.')
