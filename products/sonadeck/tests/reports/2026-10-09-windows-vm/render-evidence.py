"""Render actual captured log text to HTML, never fabricate product UI."""
from html import escape
from pathlib import Path

root = Path(__file__).resolve().parent
pages = {
    'environment': ('环境与虚拟化验证 / Environment', ['baseline.json', 'kvm.log']),
    'audio': ('音频转发端点 / Audio transport', ['audio-display.log', 'pulse-sinks.log']),
    'guest-audio': ('macOS 客体音频基线 / Guest audio baseline', ['mac-audio.log', 'qemu-pulse.log']),
    'mac-tests': ('macOS XCTest 工具链阻断 / Missing XCTest', ['mac-tests.log']),
    'mac-portable-tests': ('macOS 同源同步断言 / Not XCTest', ['mac-portable-tests.log']),
    'domain-tests': ('现有配置领域测试 / ProfileDomain', ['domain-tests.log']),
    'prototype-tests': ('原型模型测试 / Prototype model', ['prototype-tests.log']),
}
for name, (title, files) in pages.items():
    if not all((root / f).exists() for f in files):
        continue
    sections = []
    for f in files:
        data = (root / f).read_bytes()
        text = data.decode('utf-16' if data.startswith((b'\xff\xfe', b'\xfe\xff')) else 'utf-8-sig')
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        sections.append(f'<h2>{escape(f)}</h2><pre>{escape(text.strip())}</pre>')
    html = f'''<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<title>{escape(title)}</title><style>
body{{margin:0;padding:32px;background:#101820;color:#ecf2f8;font:16px/1.55 "Microsoft YaHei",Arial,sans-serif}}
h1{{font-size:28px;margin:0 0 12px}}h2{{font-size:18px;color:#9cc8ef}}
p{{color:#cad2db}}pre{{white-space:pre-wrap;overflow-wrap:anywhere;background:#192532;padding:20px;border:1px solid #41566a;border-radius:8px;font:14px/1.45 Consolas,monospace}}
</style><h1>{escape(title)}</h1>
<p>2026-10-09 · SonaDeck · 实际日志展示页截图，非产品 UI / Captured logs, not product UI</p>
{''.join(sections)}</html>'''
    (root / 'screenshots' / f'{name}.html').write_text(html, encoding='utf-8', newline='\n')
