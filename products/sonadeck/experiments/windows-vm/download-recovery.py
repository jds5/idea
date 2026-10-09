"""Resume a recovery download and verify Apple's signed chunklist.

Requires a separately reviewed OSX-KVM fetch-macOS-v2.py. No Apple tokens
are printed or persisted. Downloads only; never installs a guest OS.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import importlib.util
from pathlib import Path
import time
from types import SimpleNamespace
from urllib.parse import urlparse
from urllib.request import Request, urlopen

p = argparse.ArgumentParser()
p.add_argument('--upstream', type=Path, required=True)
p.add_argument('--output', type=Path, required=True)
args = p.parse_args()
args.output.mkdir(parents=True, exist_ok=True)
spec = importlib.util.spec_from_file_location('recovery', args.upstream)
recovery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(recovery)
info = recovery.get_image_info(
    recovery.get_session(SimpleNamespace(verbose=False)), 'Mac-7BA5B2D9E42DDD94')
print('Recovery product:', info['AP'], flush=True)


def fetch(url, token, start=None, end=None):
    headers = {'Host': urlparse(url).hostname, 'Connection': 'close',
               'User-Agent': 'InternetRecovery/1.0', 'Cookie': 'AssetToken=' + token}
    if start is not None:
        headers['Range'] = f'bytes={start}-{end}'
    for attempt in range(4):
        try:
            request_url = url
            if start is not None and attempt:
                request_url += ('&' if '?' in url else '?') + f'range={start}-{end}&retry={attempt}'
            if attempt >= 2 and urlparse(url).hostname == 'oscdn.apple.com':
                request_url = request_url.replace('http://oscdn.apple.com/', 'https://swcdn.apple.com/')
            headers['Host'] = urlparse(request_url).hostname
            with urlopen(Request(request_url, headers=headers), timeout=30) as response:
                if start is not None:
                    expected = f'bytes {start}-{end}/'
                    if response.status != 206 or not response.headers.get('Content-Range', '').startswith(expected):
                        raise ValueError('Server did not honor byte range')
                data = response.read()
            if start is not None and len(data) != end - start + 1:
                raise ValueError('Truncated byte range')
            return data
        except Exception:
            if attempt == 3:
                raise
            time.sleep(1 + attempt)


chunklist = args.output / 'BaseSystem.chunklist'
chunklist.write_bytes(fetch(info['CU'], info['CT']))
# Consuming this generator also validates the Apple chunklist signature.
chunks = list(recovery.verify_chunklist(chunklist))
total = sum(size for size, _ in chunks)
print(f'Signed chunklist verified: {len(chunks)} chunks, {total} bytes', flush=True)
parts = args.output / 'verified-parts'
parts.mkdir(exist_ok=True)


def download_chunk(index, offset, size, digest):
    part = parts / f'{index:04d}.part'
    if part.exists() and part.stat().st_size == size and hashlib.sha256(part.read_bytes()).digest() == digest:
        return index
    # Keep requests small because some network paths truncate large transfers.
    data = bytearray()
    for start in range(offset, offset + size, 256 * 1024):
        end = min(start + 256 * 1024, offset + size) - 1
        data.extend(fetch(info['AU'], info['AT'], start, end))
    if hashlib.sha256(data).digest() != digest:
        raise ValueError(f'Chunk {index} SHA-256 mismatch')
    part.write_bytes(data)
    return index


with ThreadPoolExecutor(max_workers=6) as pool:
    pending = []
    offset = 0
    for index, (size, digest) in enumerate(chunks):
        pending.append(pool.submit(download_chunk, index, offset, size, digest))
        offset += size
    for count, future in enumerate(as_completed(pending), 1):
        future.result()
        print(f'Verified chunks: {count}/{len(chunks)}', flush=True)

output = args.output / 'BaseSystem.verified.dmg'
assembling = args.output / 'BaseSystem.assembling.dmg'
with assembling.open('wb') as target:
    for index in range(len(chunks)):
        target.write((parts / f'{index:04d}.part').read_bytes())
assert assembling.stat().st_size == total
assembling.replace(output)
print('PASS: complete recovery image; all signed chunk hashes verified.', flush=True)
digest = hashlib.sha256()
with output.open('rb') as source:
    while data := source.read(1024 * 1024):
        digest.update(data)
print('SHA256:', digest.hexdigest(), flush=True)
