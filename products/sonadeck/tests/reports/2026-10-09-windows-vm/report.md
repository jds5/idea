# Windows / Docker macOS 与 SonaDeck 原型测试

执行日期：2026-10-09（Asia/Shanghai）。本报告区分环境实验、Linux 模型测试、原生 UI 和真实音频；不以恢复系统画面代替产品 UI 验收。

## 已完成的验证

| 测试组 | 结果 | 证据 |
| --- | --- | --- |
| 嵌套 KVM 执行客体代码 | 通过；成功创建 VM/vCPU 并执行 HLT | [日志](kvm.log)、[截图](screenshots/environment.png) |
| OpenCore 与 macOS 恢复 UI | 通过；恢复系统为 macOS 15.4.1（24E263），鼠标、键盘、磁盘工具可操作 | [恢复界面](screenshots/05-recovery-progress.png)、[版本](screenshots/08-recovery-version.png) |
| 独立虚拟磁盘 | 新建 120 GiB qcow2，已格式化为 APFS；未挂载物理盘/业务数据 | [安装目标](screenshots/06-install-start.png) |
| 完整 macOS 与本地桌面 | 已完成安装与本地账户设置；macOS 15.8.1（24H32），Intel x86_64 | [客体诊断](guest-setup.log) |
| macOS 客体工具链 | Command Line Tools 16.4 的五个组件安装成功，Swift 6.1.2 可运行 | [安装日志](softwareupdate.log) |
| 现有 ProfileDomain | 8 项 XCTest，0 失败，Docker 退出码 0 | [日志](domain-tests.log)、[执行记录](domain-result.json)、[截图](screenshots/domain-tests.png) |
| 新增原型模型 | 8 项 XCTest，0 失败，Docker 退出码 0 | [日志](prototype-tests.log)、[执行记录](prototype-result.json)、[截图](screenshots/prototype-tests.png) |
| WSLg 音频端点 | 容器可连接 PulseAudio，枚举到 RDPSink，s16le / 2ch / 44100Hz | [日志](pulse-sinks.log)、[截图](screenshots/audio.png) |
| 客体音频基线 | 环境项失败：macOS 没有枚举可用设备；播放系统提示音返回 `AudioQueueStart failed (-66680)`，退出 1 | [客体音频日志](mac-audio.log) |

本轮已完成：Windows 上的 Docker / KVM 可以运行完整 Intel macOS、编译并操作最小原生 SwiftUI 原型。UI-01–10 人工测试通过，截图见[可筛选图库](index.html)。客体音频基线失败，按用户授权记录为环境限制；真实 Mac 的 M0 音频门槛仍未完成。

## 原生构建与功能验证

| 项目 | 结果与证据 |
| --- | --- |
| SwiftUI 编译、应用打包和本地 ad-hoc 签名校验 | 通过；[首次构建](mac-build-initial.log) SwiftPM 报告 826.97 秒，[布局修复增量构建](mac-build.log) 122.56 秒；不是正式性能基准或发布签名 |
| macOS XCTest | 工具链阻断，未执行测试；CLT 缺少 XCTest，[原始失败](mac-tests.log)保留；[Testing 模块](testing-module-probe.log)也不可用 |
| macOS 同源同步断言 | [16 项通过](mac-portable-tests.log)，链接实际构建的领域与模型对象；复用未修改的 XCTest 测试方法体，以便携断言适配器执行，**不是 XCTest 运行结果** |
| 便携适配器校验 | 正向断言通过，7 个故意失败的负向控制均被拒绝；[日志](portable-assertions-validation.log)、[退出码记录](portable-assertions-result.json) |

| UI 用例 | 操作与观察结果 | 截图 |
| --- | --- | --- |
| UI-01 | 空状态清晰，应用与另存禁用 | [首次启动](screenshots/ui-01-empty.png) |
| UI-02 | 工作/会议切换，目标与模拟完整生效一致、规则行变化 | [工作](screenshots/ui-02-work.png)、[会议](screenshots/ui-02-meeting.png) |
| UI-03 | 音量改为 23%、静音、USB 输出；草稿未直接改变实际 | [编辑草稿](screenshots/ui-03-draft.png) |
| UI-04 | 另存自定义 1 不覆盖原配置、不自动应用；选择后生效 | [另存](screenshots/ui-04-saved.png)、[应用](screenshots/ui-04-applied.png) |
| UI-05 | USB 缺失阻断音乐配置，保留原实际；恢复后重试成功 | [失败](screenshots/ui-05-missing-device.png)、[恢复](screenshots/ui-05-recovered.png) |
| UI-06 | 权限拒绝保留原实际；恢复权限后 Cmd+Return 重试成功 | [拒绝](screenshots/ui-06-permission.png)、[恢复](screenshots/ui-06-recovered-keyboard.png) |
| UI-07 | 注入执行失败不假报成功；重试恢复 | [失败](screenshots/ui-07-failure.png)、[重试](screenshots/ui-07-retry.png) |
| UI-08 | 会议未运行时 1 项生效、1 项待生效，整套实际为无；恢复后完整生效 | [待生效](screenshots/ui-08-pending.png)、[恢复](screenshots/ui-08-recovered.png) |
| UI-09 | 返回工作先应用保存版本；显式恢复 23% 草稿不立即应用，应用后不冒充保存预设 | [保存版本](screenshots/ui-09-saved-version.png)、[恢复草稿](screenshots/ui-09-restored.png)、[应用草稿](screenshots/ui-09-applied-draft.png) |
| UI-10 | 最小内容区 760×640 无遮挡；系统键盘导航开启后 Tab 焦点和 Space 选择正常；深浅色状态可辨 | [最小窗口](screenshots/ui-10-minimum.png)、[键盘操作](screenshots/ui-10-keyboard-action.png)、[深色错误](screenshots/ui-10-dark-error.png) |
| 会话重启 | 退出再启动，自定义配置清空、目标/实际为无、环境开关重置，符合仅会话保存范围 | [重启空状态](screenshots/ui-10-relaunch-empty.png) |

以上 UI 均在 macOS 客体原生窗口手动操作并抓取 framebuffer。真实权限、设备热插拔、音频路由、VoiceOver、Retina、菜单栏和动画性能不在本轮通过项内。发现空状态与规则状态切换会引起布局跳动，已固定规则区域伸展并重新原生构建、检查两种状态。

## 环境与复现

- 主机：Ryzen 7 9700X（8C/16T）、约 32 GB RAM、Windows 11 Pro Build 26300。
- Docker Desktop 4.65.0；Engine 29.2.1；WSL2 内核 6.6.87.2；Linux x86_64。
- QEMU 10.0.13；macOS 实验 VM 分配 6 vCPU、8 GiB RAM；外层容器限额 8 CPU / 10 GiB。
- 客体显示设备为 VMware `0x15ad:0x0405`，3 MB VRAM、1280×800，系统报告 `No Kext Loaded`；宿主 RTX 5080 未透传。[客体环境](mac-environment.log)。
- 模型测试：Swift 6.2.4，每次干净临时构建，源码只读挂载，容器断网，4 CPU / 3 GiB。完整[基线](baseline.json)、[工具链](swift-version.log)、[镜像标识](swift-image.log)。
- 代码基线为 `a43921a4ec902f207714a48bde257066f1b28f6f` 加本轮原型与测试脚本；具体运行命令在两份执行记录中。
- 发往 macOS 客体的源码/构建文件已与工作树逐字节核对，[源码清单](source-manifest.json)记录压缩包及每个文件的 SHA-256。
- 虚拟机大文件仅保存在本机 `C:/Users/yaoch/sonadeck-vm-lab`，未加入 Git。QMP/VNC 仅映射到本机回环地址。

从仓库根目录运行：

```powershell
python products/sonadeck/experiments/windows-vm/run-tests.py domain
python products/sonadeck/experiments/windows-vm/run-tests.py prototype
```

Linux 输出中的 `Compiling PrototypeUI` 只编译了非 macOS 的平台提示入口，**没有编译 SwiftUI 分支**。日志末尾 Swift Testing 显示的 0 tests 是另一测试运行器；前面的 8 项 XCTest 才是各组实际测试数。

## 原型模型覆盖

1. 工作/会议 20 次往返，检查每次旧独有规则释放和新配置实际标识。
2. USB 缺失时整套阻断，实际配置和规则保持原值，恢复设备后重试。
3. 权限拒绝和执行故障注入均不假报成功，重试可恢复。
4. 未运行会议应用待生效，整套不标记完整；启动后重试完成。
5. 编辑草稿不立即修改实际；返回旧配置先应用保存版本，显式恢复草稿不立即应用；修改状态不冒充已保存预设。
6. 另存保持原配置，保存本身不应用新目标。
7. 非法增益既不能保存，也不能应用。
8. 配置 JSON 编解码往返保持内容。

这些是内存模拟后端与真实领域计划器的集成测试，不包含系统音频设置、磁盘持久化、真实设备热插拔或音频故障恢复。

音频基线使用 `system_profiler SPAudioDataType` 与 `afplay /System/Library/Sounds/Glass.aiff`，没有录音。该次 QEMU 使用 `-audiodev none`，虚拟 HDA 未被客体识别为可用设备；不能据此断言 Docker/WSLg 无法转发声音。另一个[独立端点测试](qemu-pulse.log)只证明 QEMU 的 PulseAudio 后端能初始化，尚未证明客体到宿主机的完整播放链路可用。

## 已遇到的问题与处理

- 原型初版返回旧配置时会自动应用保留的草稿，与[配置规范](../../../docs/profiles.md)冲突。已改为先应用保存版本、显式恢复草稿，并重跑 8 项模型测试通过。
- `sickcodes/docker-osx:sequoia` 无可用 manifest；改为自行准备 QEMU、上游固件和 Apple 恢复介质。
- Windows 下载路径多次截断恢复镜像；改用分段下载与签名 chunklist 校验，容器路径补齐失败分块。[最终校验日志](recovery-verification.log)记录所有 85 块通过，镜像 SHA-256 为 `7314eb401f5e84087f621b3599f0ad21ca3cdcc2685ea2da7f76806792328e20`。
- 下载组装与 DMG 转换曾发生竞态，首次转换失败。脚本已改为完成组装后原子替换，并要求等待下载进程退出再启动。
- AMD KVM 初次启动报告未处理 `WRMSR(0x1d9)`。[日志](kvm-msr-before.log)。临时把共享 WSL 内核 `ignore_msrs` 从 N 改为 Y 后进入恢复 UI；测试结束需先停止本轮 VM，再恢复 N。
- Swift 常规拉取遇到慢下载和共享层锁等待；用官方镜像公共镜像源分段下载，逐层校验 SHA-256 后导入 OCI。
- Windows 测试包装器最初因 GBK 无法输出 Swift Unicode 日志而退出 1，测试本体已通过。包装器已固定 UTF-8 并生成结构化执行记录；重跑两组后包装器和 Docker 均退出 0。
- Windows 原生截图服务连接失败，按技能恢复流程重试仍不可用。虚拟机图片改用 QEMU framebuffer；日志图片用 Chromium 截取原始日志 HTML 展示页。
- 完整安装阶段出现 CPU 持续忙碌且磁盘不再推进的停滞，保留[寄存器与磁盘诊断](install-stall.json)并创建 `install-stall-20261009` 内部磁盘快照后重启，安装继续完成。首次进入图形界面时有数分钟灰屏，后续自行进入设置；尚未证明灰屏原因已修复。
- 初次登录期间 `efilogin-helper` 等后台任务持续占用 CPU，界面刷新延迟明显。此次 Intel 虚拟机结果不作为动画流畅度验收。

## 截图说明

`ui-*` 和 `01`–`10` 为 QEMU 实际 framebuffer，经无损 PPM → PNG 转换，没有拼接成产品界面。环境、音频及测试日志图片为日志展示页截图，明确标注“非产品 UI”；[渲染脚本](render-evidence.py)只转义并展示已捕获文本。全部图片见[图库](index.html)。

- [OpenCore 初始画面](screenshots/01-uefi.png)
- [恢复介质启动项](screenshots/02-recovery-boot.png)
- [初次 Apple 启动画面](screenshots/03-recovery-start.png)
- [兼容参数重试后的启动进度](screenshots/04-recovery-retry.png)
- [恢复系统主界面](screenshots/05-recovery-progress.png)
- [系统安装目标](screenshots/06-install-start.png)
- [系统安装进度](screenshots/07-install-progress.png)
- [恢复系统版本](screenshots/08-recovery-version.png)

## 环境收尾

已恢复浅色主题、关闭临时键盘导航、重新启用 Spotlight，并撤销 Terminal 的临时 AppleEvents 授权；见[客体恢复记录](guest-cleanup.log)。客体通过 `sudo shutdown -h now` 正常关机，实验辅助容器停止；共享 WSL KVM `ignore_msrs` 已恢复原值 N，见[宿主恢复记录](host-cleanup.json)。磁盘与随机客体密码保留在本机实验目录，未提交仓库。

## 未验证限制

这是非 Apple 硬件上的 Intel macOS 技术实验，不代表 Apple Silicon 支持、正式许可/分发结论或发布认证。虚拟 GPU、单一音频转发端点和 Windows 上的磁盘文件均会影响结果；不能从此推断真实 Mac 的动画帧率、音频时延、USB/蓝牙兼容性。M0 真机音频门槛仍未完成。

原型范围与 UI 测试矩阵见[原型说明](../../../app/SonaDeckPrototype/README.md)，环境脚本见[实验说明](../../../experiments/windows-vm/README.md)。
