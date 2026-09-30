# 首个工程增量验证记录

日期：2026-09-30。环境：Windows、Node 24.12.0、Docker Desktop Linux 容器。非 NAS 实机，不代表海外用户延迟或长期运行成本。

## 已执行

| 项目 | 实际结果 | 证据边界 |
| --- | --- | --- |
| Node 领域/接口/缓存测试 | 14 项通过 | 合成测试覆盖模型独立性、阈值分歧、缺失、原生步长/起报未知、过期、连续时间、预警未知、单位变化、503、输入校验和失败保留旧缓存 |
| Android Debug 构建 | 已生成内部 APK | Docker 固定 SDK 镜像；不代表安装和真机流程已验收 |
| Android JVM 单元测试 | 9 项通过 | 6 项比较/时区规则，3 项计划序列化/损坏处理；AtomicFile 在设备上的掉电恢复仍待验 |
| Android lint | 最终 0 errors、7 warnings；已补齐图标与 Android 12+ 备份排除 | 6 项固定依赖新版本提示、1 项资源目录版本可简化提示；无隐藏 lint baseline |
| 真实来源采集 | 六座城市 × GFS/ICON，各 71 个对齐小时四字段完整 | 3 个 UTC 日共 72 点转换为 71 区间；并非 71 小时全部在未来。App 最多暴露 48 个未来起点 |
| Docker 缓存卷 | collector 以 node 用户写入；gateway 只读挂载 | 验证本地命名卷，不是 NAS→VPS 公网复制 |
| 来源断开 | 停止 `dayward-dev-source` 后，8788 网关仍返回六城天气与窗口参考 | 未把实时用户请求转发给来源 |
| 网关重启 | 重启后六城快照仍可读，窗口响应保留所选小时基线 | 说明命名卷持久化有效，不等于磁盘灾备 |
| 官网 Chrome | 1440 px 桌面、390 px 窄屏截图检查；锚点、来源/隐私导航和键盘跳转检查通过 | 页面无 live 天气，无横向溢出（桌面 DOM 检查），不以截图证明 Android 体验 |

本轮真实查询的所有窗口均返回 `insufficient`：起报、原生小时和官方预警门槛未满足。这是预期的质量降级，不是把测试用的“符合偏好”结果伪装成实际推荐。首次伦敦冷读取达到 120 秒超时，重试后成功；后续热读成功。没有据此给出生产服务 SLA。

取数后查询容器资源快照约 271 MiB（2 GiB 限制）、网络接收 13.5 MB；这是小样本累计快照，不是模型推理算力或 NAS 月流量预测。

## 复现与本地证据

- 命令见[开发说明](development.md)；`node service/smoke.mjs <网关地址>` 可重新核验六城真实缓存与质量门槛，未来数据缺失时会明确失败。
- APK：`app/android/app/build/outputs/apk/debug/app-debug.apk`。
- Android 测试：`app/android/app/build/test-results/testDebugUnitTest/`；lint：`app/android/app/build/reports/lint-results-debug.html`。
- 本地忽略产物：`artifacts/docker-smoke.json`、`website-desktop.png`、`website-mobile.png`。它们不是版本库中的固定天气数据。
- 本轮最终预览是 Docker 网关 **http://127.0.0.1:8788**，容器名 `dayward-gateway-check`；默认 Compose 全栈端口仍是 8787。本机 8787 留有早期开发进程，不作为最终接口验证入口。
- 若直接连接本轮预览：Android 模拟器使用 `http://10.0.2.2:8788`；USB 真机先 `adb reverse tcp:8788 tcp:8788`，再填 `http://127.0.0.1:8788`。这些连接步骤尚未在设备上执行。
- `dayward-source-1`、`dayward-collector-1` 在本机进行每小时后台采集；停止本轮后台任务可用 Compose `stop source collector`，预览网关可用 `docker stop dayward-gateway-check`。不删除缓存卷。

## 未验证及下一步

Android 模拟器/真机安装、保存→杀进程→重启→复查全过程、TalkBack、大字体、深色模式、低端机动画和 HTTP 异常恢复需设备验收。当前只提供英语和公制；并未实现完整海外本地化。

完整 P0 尚缺自动候选时段、多地点对比、预警与更长覆盖的验证。通知、组件、分享、真实广告/购买、周趋势和正式发布未完成。下一项优先是可追溯模型版本/原生步长数据接入，随后真机闭环与连续数据验证；不以补一层 AI 文案替代。

NAS、跨境网络、海外 VPS、Cloudflare、密钥管理、公开服务限流/监控/支持和正式商业许可履约未部署验证。

## 实现所依据的官方资料

2026-09-30 核验：[Open-Meteo 参数定义](https://open-meteo.com/en/docs)、[模型更新状态](https://open-meteo.com/en/docs/model-updates)、[模型状态页面源码](https://github.com/open-meteo/open-meteo-website/blob/main/src/routes/en/docs/model-updates/%2Bpage.svelte)。全局模型状态不直接证明本适配器拼接序列的每点版本，因此本轮保守保留未知。

[Android 备份规则](https://developer.android.com/identity/data/autobackup)、[AGP 8.13 发布说明](https://developer.android.com/build/releases/agp-8-13-0-release-notes)、[Compose 编译器配置](https://developer.android.com/jetpack/androidx/releases/compose-kotlin)、[SDK 容器构建配置](https://github.com/cirruslabs/docker-images-android/blob/master/.cirrus.yml)。Wrapper JAR SHA-256 与 [Gradle 官方校验值](https://services.gradle.org/distributions/gradle-8.13-wrapper.jar.sha256)一致：`81a82aaea5abcc8ff68b3dfcb58b3c3c429378efd98e7433460610fecd7ae45f`。
