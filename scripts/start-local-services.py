"""Restart only this checkout's four local services; logs stay in ignored local storage."""
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import time

root = Path(__file__).resolve().parent.parent
logs = root / '.local-build' / 'local-services'
logs.mkdir(parents=True, exist_ok=True)
services = [
    ('auth', 'authService', 'index.js', 4003, [4003]),
    ('seeker', 'Seeker_Service', 'index.js', 6000, [6000, 6001]),
    ('provider', 'Provider_Service/Backend', 'index.js', 3002, [3002]),
    ('coordination', 'ServiceCoordinationService', 'src/server.js', 5010, [5010]),
]

def listeners(port):
    p = subprocess.run(['lsof', '-nP', f'-iTCP:{port}', '-sTCP:LISTEN', '-t'], capture_output=True, text=True)
    return [int(value) for value in p.stdout.split()]

def cwd(pid):
    p = subprocess.run(['lsof', '-a', '-p', str(pid), '-d', 'cwd', '-Fn'], capture_output=True, text=True)
    return next((Path(line[1:]).resolve() for line in p.stdout.splitlines() if line.startswith('n')), None)

# Validate every occupied port before stopping anything.
stop = {}
for name, relative, _, _, ports in services:
    for port in ports:
        for pid in listeners(port):
            if cwd(pid) != (root / relative).resolve():
                raise SystemExit(f'Port {port} belongs to another application; it was not stopped.')
            stop[pid] = (name, root / relative)
for pid, (name, service_dir) in stop.items():
    parent = subprocess.run(['ps', '-p', str(pid), '-o', 'ppid='], capture_output=True, text=True).stdout.strip()
    if parent.isdigit():
        parent_id = int(parent)
        command = subprocess.run(['ps', '-p', parent, '-o', 'args='], capture_output=True, text=True).stdout
        if 'nodemon' in command and cwd(parent_id) == service_dir.resolve():
            try: os.kill(parent_id, signal.SIGTERM)
            except ProcessLookupError: pass
    try: os.kill(pid, signal.SIGTERM)
    except ProcessLookupError: pass
for _ in range(50):
    if not any(listeners(port) for _, _, _, _, ports in services for port in ports): break
    time.sleep(0.1)
else: raise SystemExit('Local service ports did not close; no replacement processes started.')

processes = {}
for name, relative, entry, port, _ in services:
    log = logs / f'{name}.log'
    fd = os.open(log, os.O_WRONLY | os.O_CREAT | os.O_APPEND, 0o600)
    with os.fdopen(fd, 'a') as output:
        env = {**os.environ, 'PORT': str(port), 'NODE_ENV': 'development'}
        process = subprocess.Popen([shutil.which('node'), entry], cwd=root / relative, env=env, stdout=output, stderr=subprocess.STDOUT, start_new_session=True)
    processes[name] = {'pid': process.pid, 'port': port}
    print(f'Started local {name} on port {port}.')
record = logs / 'processes.json'
record.write_text(json.dumps(processes, indent=2) + '\n')
os.chmod(record, 0o600)
