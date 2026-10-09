"""Build a local index of captured evidence; does not create or alter screenshots."""
from datetime import datetime
from html import escape
from pathlib import Path

root = Path(__file__).resolve().parent
titles = {
    'ui-01-empty': 'UI-01 首次启动与空状态',
    'ui-02-work': 'UI-02 工作配置完整模拟生效',
    'ui-02-meeting': 'UI-02 会议配置切换与规则变化',
    'ui-03-draft': 'UI-03 编辑音量、静音与输出草稿',
    'ui-04-saved': 'UI-04 会话内另存，尚未应用',
    'ui-04-applied': 'UI-04 新配置模拟应用完成',
    'ui-05-missing-device': 'UI-05 USB 缺失，保留原实际配置',
    'ui-05-recovered': 'UI-05 恢复设备后重试',
    'ui-06-permission': 'UI-06 权限拒绝与实际状态',
    'ui-07-failure': 'UI-07 注入执行失败',
    'ui-07-retry': 'UI-07 重试恢复',
    'ui-08-pending': 'UI-08 应用未运行，整套尚未完全生效',
    'ui-08-recovered': 'UI-08 启动模拟应用后重试',
    'ui-09-saved-version': 'UI-09 返回配置先应用保存版本',
    'ui-09-restored': 'UI-09 显式恢复草稿',
    'ui-09-applied-draft': 'UI-09 应用草稿后不冒充已保存预设',
    'ui-10-minimum': 'UI-10 最小窗口布局',
    'ui-10-keyboard': 'UI-10 键盘焦点与操作',
    'ui-10-dark': 'UI-10 深色外观',
    'ui-06-recovered-keyboard': 'UI-06 恢复权限与快捷键重试',
    'ui-10-keyboard-action': 'UI-10 Tab 与 Space 切换配置',
    'ui-10-dark-error': 'UI-10 深色模式错误提示',
    'ui-10-relaunch-empty': '会话重启：自定义配置清空',
    '01-uefi': 'OpenCore 初始启动',
    '02-recovery-boot': '恢复介质启动项',
    '03-recovery-start': '首次启动诊断',
    '04-recovery-retry': '兼容参数重试',
    '05-recovery-progress': 'macOS 恢复主界面',
    '06-install-start': '独立虚拟磁盘安装目标',
    '07-install-progress': '恢复环境中的安装进度',
    '08-recovery-version': '恢复系统完整版本',
    '09-initial-graphics-gray': '首次图形启动的灰屏等待',
    '10-macos-desktop': '完整 macOS 桌面与工具链准备',
    'environment': 'PC / Docker / KVM 环境日志',
    'audio': 'WSLg 音频端点日志',
    'guest-audio': '客体音频失败与 QEMU 端点初始化日志',
    'mac-tests': 'macOS XCTest 工具链阻断日志',
    'mac-portable-tests': 'macOS 16 项同源断言通过（非 XCTest）',
    'domain-tests': '8 项配置领域测试日志',
    'prototype-tests': '8 项原型模型测试日志',
}
cards = []
for path in sorted((root / 'screenshots').glob('*.png'),
                   key=lambda path: (not path.stem.startswith('ui-'), path.name)):
    name = path.stem
    group = 'ui' if name.startswith('ui-') else ('logs' if name in {
        'environment', 'audio', 'guest-audio', 'domain-tests', 'prototype-tests', 'mac-tests', 'mac-portable-tests'
    } else 'environment')
    category = {'ui': '原生原型 UI', 'logs': '实际日志 · 非产品 UI',
                'environment': '虚拟机环境 · 非产品 UI'}[group]
    title = titles.get(name, name)
    stamp = datetime.fromtimestamp(path.stat().st_mtime).astimezone().isoformat(timespec='seconds')
    href = 'screenshots/' + path.name
    cards.append(f'''<article data-group="{group}">
<a href="{escape(href)}" target="_blank" rel="noopener"><img loading="lazy"
src="{escape(href)}" alt="{escape(title)}"></a>
<div><small>{escape(category)}</small><h2>{escape(title)}</h2>
<p><a href="{escape(href)}" target="_blank" rel="noopener">打开原始 PNG</a> · {escape(path.name)}</p>
<p class="stamp">文件时间：{escape(stamp)}</p></div></article>''')
html = '''<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SonaDeck 测试截图 · 2026-10-09</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f6f8;color:#182334;font:16px/1.6 system-ui,"Microsoft YaHei",sans-serif}
main{max-width:1440px;margin:auto;padding:32px}h1{font-size:30px;margin:0}h2{font-size:19px;margin:8px 0}
p{margin:8px 0}a{color:#165a98}nav{display:flex;gap:10px;flex-wrap:wrap;margin:24px 0}
button{font:inherit;padding:8px 16px;border:1px solid #8a9baa;border-radius:8px;background:white;cursor:pointer}
button[aria-pressed=true]{background:#174b75;color:white}button:focus-visible,a:focus-visible{outline:3px solid #ed8b26;outline-offset:3px}
section{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;align-items:start}
article{background:white;border:1px solid #d9dfe5;border-radius:12px;overflow:hidden}article[hidden]{display:none}
article>div{padding:18px}img{display:block;width:100%;height:360px;object-fit:contain;background:#e5e9ee}
small,.stamp{color:#566779}.stamp{font-size:12px}aside{padding:16px;background:#e6eef5;border-radius:10px;margin:20px 0}
@media(max-width:800px){section{grid-template-columns:1fr}main{padding:20px}img{height:auto}}
</style><main><h1>SonaDeck 测试截图</h1><p>2026-10-09 · Windows / Docker / QEMU 实验</p>
<aside>截图只呈现捕获时的画面。测试判定、步骤、失败原因和限制以 <a href="report.md">测试报告</a> 为准。
恢复系统与日志截图不计为 SonaDeck UI 验收；虚拟机不替代真实 Mac 音频或动画性能测试。</aside>
<nav aria-label="截图分类"><button data-filter="all" aria-pressed="true">全部</button>
<button data-filter="ui" aria-pressed="false">原生产品 UI</button>
<button data-filter="environment" aria-pressed="false">虚拟机环境</button>
<button data-filter="logs" aria-pressed="false">测试日志</button></nav><section>
''' + '\n'.join(cards) + '''</section></main><script>
document.querySelectorAll('button[data-filter]').forEach(button=>button.addEventListener('click',()=>{
document.querySelectorAll('button[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
document.querySelectorAll('article').forEach(card=>card.hidden=button.dataset.filter!=='all'&&card.dataset.group!==button.dataset.filter);
}));</script></html>'''
(root / 'index.html').write_text(html, encoding='utf-8', newline='\n')
print(f'Indexed {len(cards)} captured screenshots.')
