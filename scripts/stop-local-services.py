"""Stop only recorded viva processes that still belong to this checkout."""
import json
import os
from pathlib import Path
import signal
import subprocess

root = Path(__file__).resolve().parent.parent
record = root / '.local-build/local-services/processes.json'
if not record.exists(): raise SystemExit('No recorded local services to stop.')
folders = {
    'auth': 'authService', 'seeker': 'Seeker_Service', 'provider': 'Provider_Service/Backend',
    'coordination': 'ServiceCoordinationService', 'duration-ml': 'ServiceCoordinationService/DurationMLService',
    'provider-web': 'Frontend/ServiceProviderFrontend', 'seeker-web': 'Frontend/Seeker_Mobile_App',
}
for name, process in json.loads(record.read_text()).items():
    if name not in folders: continue
    pid = process['pid']
    result = subprocess.run(['lsof', '-a', '-p', str(pid), '-d', 'cwd', '-Fn'], capture_output=True, text=True)
    if 'n' + str(root / folders[name]) not in result.stdout.splitlines(): continue
    try:
        if os.getpgid(pid) == pid: os.killpg(pid, signal.SIGTERM)
        else: os.kill(pid, signal.SIGTERM)
        print('Stopped local ' + name + '.')
    except ProcessLookupError: pass
record.write_text('{}\n')
os.chmod(record, 0o600)
