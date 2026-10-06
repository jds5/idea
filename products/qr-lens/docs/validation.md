# 验证记录

日期：2026-10-07。环境：Windows、Node.js 22.16.0、npm 10.9.2、Playwright 1.56.1、Chromium 141.0.7390.37。未进行 Chrome Web Store 发布。

## 已验证

- `npm run build`：成功生成可加载的 Manifest V3 扩展，依赖包含在本地 bundle，附 jsQR 许可证。
- `npm test`：4 项测试全部通过。覆盖多二维码、不同位置的重复字符串、中文、换行、HTML 字面量、反色、旋转、空白图、预算耗尽标记、反向选区和完整包含规则。
- `npm run test:browser`：真实 Chromium 扩展环境通过截图 → 后台解码 → 遮罩结果 → 框选筛选 → 系统剪贴板的集成测试。
- 浏览器验证：3 个二维码均识别；框选后只剩 1 个；复制得到准确字符串；在结果文本框拖动选字不会改变选区；恢复全部、反向拖动、无结果选区、键盘框选、Esc、再次点击关闭和窗口尺寸变化清理均通过。
- 空白页显示无结果；`chrome://version` 受限页在扩展按钮显示 `!`。
- 网页新增严格 `img-src 'self'` 策略后，截图仍可通过隔离环境解码并绘制到 canvas。
- 已检查 `artifacts/full.png` 与 `artifacts/selection.png`：结果面板、选区和二维码位置对应，字符串可见且不会作为 HTML 执行。
- `npm audit --omit=dev`：本次检查报告 0 个已知生产依赖漏洞。

测试边界：浏览器测试专用构建开放 shadow root 供 Playwright 检查，正式构建使用 closed shadow root。测试 manifest 临时加入 `<all_urls>` 以替代自动化无法模拟的工具栏 activeTab 授权，并导出测试触发函数；这两项均不进入正式 `dist`。截图、脚本注入、消息、后台解码、DOM 交互和剪贴板使用真实浏览器接口。**这不代表已验收正式包的工具栏点击与权限授予。**

首次执行时 Playwright 的 Windows 依赖检查器尚未下载，使用进程级 `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` 绕过主机依赖预检，实际浏览器成功启动且测试执行完成；未跳过任何产品测试断言。

## 复现

在产品目录执行：

```powershell
npm ci
npm run build
npm test
npx playwright install chromium
npm run test:browser
```

浏览器测试使用临时配置目录、本地 HTTP 合成二维码页面，不操作用户日常 Chrome 配置或登录状态。生成截图与测试扩展位于被 Git 忽略的 `artifacts/`。

## 仍待人工验收

1. 在日常 Chrome 加载正式 `dist`，使用工具栏点击验证 activeTab 权限和连续打开/关闭。
2. 不同系统 DPI、浏览器缩放、多显示器与窗口切换；特别是极小窗口、截图时切换标签页和动态页面。
3. 真实网站的跨域 iframe、canvas 二维码、密集排列、模糊与低对比度、超长文本；评估召回率与耗时。
4. 读屏软件、完整键盘导航、HTTP 页面剪贴板降级与复制权限被拒绝。
5. Chrome 109 最低版本，以及 macOS/Linux 上的 Chrome；当前自动化不能替代这些平台的实机体验。

没有对识别率、全设备兼容或 10 秒内完成作保证；上限见[产品需求](product-spec.md)。
