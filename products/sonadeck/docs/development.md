# 开发执行与非 Mac 测试

更新日期：2026-09-23。阶段：M1 领域基础开始；M0 音频可行性仍待 Mac 真机实验。

## 当前可开发的边界

`app/ProfileDomain/` 是无平台音频 API 的 Swift Package，负责配置规则及切换前的纯逻辑计划。当前代码只处理**每应用增益、静音、输出目标**的意图；系统默认输入 / 输出、硬件音量、配置持久化、真实音频执行、读回与恢复尚未实现。包内 `AudioObservation` 必须由未来音频后端提供，不能用“已选中配置”代替实际观察。

此工作与 [M0 技术验证](roadmap.md)并行，但不能作为 M0 通过证据。真实后端的资源建立和释放顺序，需要在 Mac 上确认后实现。

## Windows + Docker 验证

仓库根目录执行（PowerShell）：

```powershell
docker run --rm -v "${PWD}:/workspace" -w /workspace/products/sonadeck/app/ProfileDomain swift:6.2.4-noble swift test
```

镜像为 Swift 官方 Docker 镜像的带编译器版本；`-slim` 只适合运行时，不含 `swift` 命令。此命令只验证跨平台领域逻辑，Linux 容器无法运行 AppKit、SwiftUI、Core Audio，也不能模拟 macOS 的音频权限、真实设备时钟、退出恢复或动画帧率。

有 Mac 后，在相同目录执行 `swift test`，再进行 Xcode 构建和真实设备实验。Swift 包通过并不意味着 Mac 应用已构建。

## 接下来的实施顺序

1. **M0 真机门槛**：准备 Apple Silicon Mac 与内置、USB、蓝牙输出；运行 Apple 的 [Core Audio taps 示例](https://developer.apple.com/documentation/coreaudio/capturing-system-audio-with-core-audio-taps)，记录系统完整版本、Xcode、权限、签名及设备。先验证捕获与原路静音，再自行验证处理后输出、双应用双设备和强制退出恢复。
2. **M0 双配置实验**：按 [路线图 SD-002–008](roadmap.md)执行，包括 20 次真实往返、独有规则释放与缺设备阻断。所有实际结果按[验证记录格式](validation.md)登记。若无法稳定恢复正常发声，先解决或重新裁定技术路线。
3. **M1 领域补全**：加入系统字段接管与所有权恢复、串行协调器、读回状态、持久化与故障注入测试。将本包作为 Mac 工程依赖；真实后端实现 `AudioObservation` 对应的能力查询和状态读取。
4. **M1 界面原型**：主窗口始终显示常用配置及真实状态，使用 fake backend 展示成功、待生效、阻断和恢复失败；Mac 上检查键盘、VoiceOver 与动画。

Mac 端实验不能由 Docker 代跑，也不以截图或编译成功替代音频观测。初次进入 Mac 环境时，优先完成 M0 门槛，再决定是否继续投入完整应用开发。
