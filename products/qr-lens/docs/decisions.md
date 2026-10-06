# 决策与路线图

核验日期：2026-10-07。

| 决策 | 状态 | 理由 |
| --- | --- | --- |
| Chrome 扩展、遮罩、多二维码、框选筛选、复制隔离 | 用户已确认 | 本轮明确要求 |
| 名称 QR Lens、当前可见视口、完整包含筛选 | 实现默认 | 避免整页滚动与截图坐标漂移；等待实际使用反馈 |
| Manifest V3；activeTab + scripting | 实现默认 | 仅主动触发时授予当前页临时访问，不需要全站 host_permissions |
| 后台 Service Worker + OffscreenCanvas + jsQR | 实现默认 | 解码不阻塞网页 UI；打包依赖，不运行远程代码；无需 offscreen 文档权限 |
| 全帧扫描加重叠分块；依次遮除已识别码 | 实现默认 | jsQR 每次返回一个码，需应用层实现多码；复杂场景召回率待验证 |
| 截图冻结、尺寸改变时退出 | 实现默认 | 结果位置始终对应本轮截图；动态页面需重新识别 |
| 不自动执行解析内容 | 实现默认 | 字符串显示和复制是当前任务的完整范围 |

技术来源（官方文档与项目原始文档）：

- [Chrome tabs.captureVisibleTab](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-captureVisibleTab)：当前活动标签页可见区域截图；需要 activeTab 或相应主机权限。
- [Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)：用户主动触发的临时授权模型。
- [Chrome offscreen](https://developer.chrome.com/docs/extensions/reference/api/offscreen)：评估过离屏文档方案，本实现不使用该 API。
- [jsQR](https://github.com/cozmo/jsQR)：RGBA 输入、二维码位置与字符串结果；Apache-2.0 授权，构建产物包含许可证。

路线图：

1. 首期实现：截图、后台解码、遮罩、结果与框选交互、失败和清理路径。
2. 自动化验证：合成二维码覆盖基础格式与多码；浏览器使用真实扩展 API 验证截图至复制的流程。具体结果见[验证记录](validation.md)。
3. 人工验收：正式构建的工具栏授权、真实网站、不同 DPI、缩放、旧版本、辅助功能。当前下一步。
4. 用户反馈后再确定名称、国际化与商店分发；未授权自动发布。
