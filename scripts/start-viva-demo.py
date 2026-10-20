"""One-command local viva launcher for the current checkout. No demo records are seeded."""
import argparse
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--host', help='Laptop LAN IP; auto-detects macOS Wi-Fi when omitted')
parser.add_argument('--no-web', action='store_true', help='Only launch backends/model; start Expo manually for phones')
args = parser.parse_args()
host = args.host
if not host:
    for interface in ['en0', 'en1']:
        result = subprocess.run(['ipconfig', 'getifaddr', interface], capture_output=True, text=True)
        if result.returncode == 0 and result.stdout.strip(): host = result.stdout.strip(); break
if not host: raise SystemExit('Could not determine LAN IP. Run again with --host YOUR_LAPTOP_IP.')
steps = [
    [sys.executable, 'scripts/setup-local-notifications.py', '--host', host],
    [sys.executable, 'scripts/start-local-services.py', '--with-ml'] + ([] if args.no_web else ['--with-web']),
    [sys.executable, 'scripts/check-local-demo.py', '--wait', '45'] + ([] if args.no_web else ['--web']),
]
for command in steps:
    result = subprocess.run(command, cwd=root)
    if result.returncode: raise SystemExit(result.returncode)
if not args.no_web:
    print('Provider: http://localhost:8082')
    print('Seeker:   http://localhost:8083')
print(f'Phone API host: {host}. Sign in again against local auth before demonstrating.')
