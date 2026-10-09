"""Run clean, bounded Linux model tests and preserve unmodified combined output."""
import argparse
from pathlib import Path
import subprocess
import sys
import json
from datetime import datetime, timedelta, timezone

sys.stdout.reconfigure(encoding='utf-8')

p = argparse.ArgumentParser()
p.add_argument('suite', choices=['domain', 'prototype'])
args = p.parse_args()
repo = Path(__file__).resolve().parents[4]
package = 'ProfileDomain' if args.suite == 'domain' else 'SonaDeckPrototype'
report = repo / 'products/sonadeck/tests/reports/2026-10-09-windows-vm'
report.mkdir(parents=True, exist_ok=True)
log = report / f'{args.suite}-tests.log'
command = ['docker', 'run', '--rm', '--network', 'none', '--cpus', '4', '--memory', '3g',
           '--mount', f'type=bind,source={repo},target=/workspace,readonly',
           '-w', f'/workspace/products/sonadeck/app/{package}', 'swift:6.2.4-noble',
           'swift', 'test', '--scratch-path', '/tmp/sonadeck-build', '-j', '4']
with log.open('wb') as output:
    result = subprocess.run(command, stdout=output, stderr=subprocess.STDOUT)
(report / f'{args.suite}-result.json').write_text(json.dumps({
    'finishedAt': datetime.now(timezone(timedelta(hours=8))).isoformat(),
    'package': package, 'platform': 'Linux container; not macOS UI',
    'exitCode': result.returncode, 'command': command,
}, ensure_ascii=False, indent=2), encoding='utf-8')
print(log.read_text(encoding='utf-8', errors='replace')[-7000:])
print(f'{args.suite}: exit={result.returncode}; log={log}')
sys.exit(result.returncode)
