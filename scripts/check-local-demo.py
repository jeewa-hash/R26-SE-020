"""Readiness and real Ridge inference checks. No accounts/jobs/notifications are created."""
import argparse
import concurrent.futures
from datetime import datetime, timezone
import json
import math
import os
from pathlib import Path
import time
import urllib.request

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--wait', type=int, default=0, help='Seconds to wait for backend startup')
parser.add_argument('--web', action='store_true', help='Also check the two Metro web servers')
args = parser.parse_args()

def read_env(relative):
    path = root / relative
    return {key.strip(): value.strip().strip('\"\'') for line in path.read_text().splitlines() if '=' in line and not line.lstrip().startswith('#') for key, value in [line.split('=', 1)]}

auth_env = read_env('authService/.env')
secret = auth_env.get('NOTIFICATION_SERVICE_SECRET', '')
if not secret: raise SystemExit('Missing local notification configuration. Run setup-local-notifications.py first.')
for path in ['Seeker_Service/.env', 'Provider_Service/Backend/.env', 'ServiceCoordinationService/.env']:
    env = read_env(path)
    if env.get('NOTIFICATION_SERVICE_SECRET') != secret or env.get('JWT_SECRET') != auth_env.get('JWT_SECRET'):
        raise SystemExit('Local JWT or notification configuration differs across services; rerun setup.')
if read_env('Seeker_Service/.env').get('REWARD_SERVICE_KEY') != read_env('ServiceCoordinationService/.env').get('REWARD_SERVICE_KEY'):
    raise SystemExit('Local reward service keys differ; rerun setup.')

def request(url, payload=None, protected=False):
    headers = {'x-notification-secret': secret} if protected else {}
    if payload is not None: headers['content-type'] = 'application/json'
    req = urllib.request.Request(url, data=None if payload is None else json.dumps(payload).encode(), headers=headers)
    with urllib.request.urlopen(req, timeout=10) as response: return json.load(response)

targets = [
    ('auth', 4003, '/internal/notifications/health'),
    ('seeker', 6001, '/health/notifications'),
    ('provider', 3002, '/health/notifications'),
    ('coordination', 5010, '/health/notifications'),
    ('duration-ml', 8001, '/health'),
]

def check(item):
    name, port, route = item
    deadline = time.monotonic() + args.wait
    while True:
        try:
            data = request(f'http://127.0.0.1:{port}{route}', protected=name != 'duration-ml')
            healthy = data.get('modelLoaded') if name == 'duration-ml' else data.get('configured') and data.get('databaseReady') and (data.get('socketReady') if name == 'auth' else data.get('workerStarted'))
            if healthy: return {'service': name, 'port': port, 'healthy': True, **{k: data[k] for k in ['pending', 'failed', 'modelVersion'] if k in data}}
        except Exception: pass
        if time.monotonic() >= deadline: return {'service': name, 'port': port, 'healthy': False, 'action': 'Check the private service log under .local-build/local-services/'}
        time.sleep(1)

with concurrent.futures.ThreadPoolExecutor() as pool: results = list(pool.map(check, targets))
for result in results: print(json.dumps(result))
passed = all(result['healthy'] and not result.get('failed', 0) for result in results)
evidence = None
if passed:
    try:
        catalogue = request('http://127.0.0.1:5010/duration/model-tasks')['data']
        task = catalogue[0]
        inputs = {'serviceCategory': task['service_category'], 'serviceType': task['service_type'], 'taskName': task['task_name'], 'yearsExperience': 7, 'taskFrequencyPerMonth': 5, 'plannedTeamSize': 1}
        prediction = request('http://127.0.0.1:8001/predict-duration', inputs)
        if prediction.get('source') != 'TRAINED_DURATION_MODEL' or not math.isfinite(prediction.get('predictedDurationMins', float('nan'))) or prediction['predictedDurationMins'] < 1: raise ValueError('Invalid model result')
        evidence = {'inputs': inputs, 'output': prediction, 'catalogueTasks': len(catalogue)}
        print(json.dumps({'check': 'real Ridge prediction', 'healthy': True, 'catalogueTasks': len(catalogue), 'minutes': prediction['predictedDurationMins'], 'source': prediction['source']}))
    except Exception:
        passed = False
        print(json.dumps({'check': 'real Ridge prediction', 'healthy': False, 'action': 'Check the duration model and coordination logs.'}))
if args.web:
    for name, port in [('provider-web', 8082), ('seeker-web', 8083)]:
        deadline = time.monotonic() + args.wait
        while True:
            try:
                with urllib.request.urlopen(f'http://127.0.0.1:{port}/status', timeout=5) as response:
                    ready = b'packager-status:running' in response.read()
                if ready: break
            except Exception: ready = False
            if time.monotonic() >= deadline: break
            time.sleep(1)
        passed = passed and ready
        print(json.dumps({'service': name, 'port': port, 'healthy': ready}))
report = root / '.local-build/viva/last-check.json'
report.parent.mkdir(parents=True, exist_ok=True)
report.write_text(json.dumps({'checkedAt': datetime.now(timezone.utc).isoformat(), 'passed': passed, 'services': results, 'modelEvidence': evidence}, indent=2) + '\n')
os.chmod(report, 0o600)
print('Viva services ready.' if passed else 'Some checks failed. Resolve them before the presentation.')
raise SystemExit(0 if passed else 1)
