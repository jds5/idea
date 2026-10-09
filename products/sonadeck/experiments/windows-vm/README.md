# Windows / Docker macOS 实验

本目录保存 2026-10-09 的可复现实验脚本。测试结果见[报告](../../tests/reports/2026-10-09-windows-vm/report.md)。这不是 SonaDeck 的正式安装流程，也不改变 Apple Silicon 优先的产品支持范围。

## 文件

- `probe-kvm.py`：创建一页客体内存和一个虚拟 CPU，执行 HLT 指令，验证嵌套 KVM 能实际运行客体代码。
- `download-recovery.py`：基于单独下载的 OSX-KVM recovery helper 请求 Apple 安装介质，分段重试，校验 Apple 签名 chunklist 及每块 SHA-256。只在校验完成后原子替换最终 DMG。
- `boot.sh`：QEMU 原型启动配置，8 GiB RAM、6 vCPU、120 GiB 独立稀疏磁盘；初始音频设为 `none`，仅呈现虚拟 HDA 设备。
- `qmp.py`：连接仅本机映射的 QMP，查询状态、发送客体输入和抓取虚拟机 framebuffer；截图不是宿主机屏幕截图。

安装镜像、虚拟磁盘、第三方固件/引导器和本地容器镜像不提交 Git。实验数据目录为 `C:/Users/yaoch/sonadeck-vm-lab`；QMP 映射 `127.0.0.1:5906`，VNC 映射 `127.0.0.1:5905`，不向局域网暴露。

## 操作顺序

1. 先运行 KVM 探测；只传入 `/dev/kvm`，无需 `--privileged`。
2. 从上游获取并审核 helper、固件、OpenCore；记录 revision 和哈希。上游来源：[OSX-KVM](https://github.com/kholia/OSX-KVM)、[Docker-OSX](https://github.com/sickcodes/Docker-OSX)。
3. 完整执行 recovery 下载与签名校验，等待进程退出码 0。不得在文件还在组装时启动 QEMU。
4. 在包含 QEMU、Python、PulseAudio 工具的本地实验镜像中，把实验目录挂载到 `/lab`，运行 `bash /lab/boot.sh`。
5. 所有格式化/安装仅指向本次创建的 `sonadeck-test.qcow2`。不得挂载物理磁盘或业务容器数据。
6. 若 AMD KVM 日志明确出现未处理 MSR，可在记录原值后临时调整 `ignore_msrs`。这是共享 WSL 内核的运行时参数，结束所有本轮 VM 后恢复原值；不修改 Windows 安全设置或永久内核配置。

从仓库根目录可执行：

```powershell
python products/sonadeck/experiments/windows-vm/qmp.py status
python products/sonadeck/experiments/windows-vm/qmp.py screenshot /lab/screen.ppm
```

`qmp.py click x,y` 的默认分辨率是 1280×800；分辨率变化必须用 `--width`、`--height` 更新，操作前观察新截图。

## 本机环境接续

本次生成的本地工具镜像为 `sonadeck-vm-tools:local`；补齐 PulseAudio 模块的镜像为 `sonadeck-vm-tools:audio`。它们不是公开镜像或发布产物。镜像中的 QEMU 为 Debian 10.0.13，`audio` 版本的 `qemu-system-x86_64 -audiodev help` 已列出 `pa`；Apple 安装介质与固件仍在独立的 `/lab` 挂载目录中。

当前机器重新使用已有容器时，先检查 KVM 参数和磁盘路径，再执行 `docker start sonadeck-macos-lab`。若需要新建容器，以下为本次无音频转发的启动方式，名称必须未被占用：

本地客体测试账户为 `sonadeck`，随机密码仅保存在本机实验目录的 `guest-password.txt`，不提交仓库。客体源码工作区为 `/Users/sonadeck/sonadeck-test`；构建状态以报告为准。

```powershell
$labPath = 'C:/Users/yaoch/sonadeck-vm-lab'
docker run -d --name sonadeck-macos-lab --device /dev/kvm --cpus 8 --memory 10g `
  -p 127.0.0.1:5905:5900 -p 127.0.0.1:5906:4444 `
  -v "${labPath}:/lab" --entrypoint bash sonadeck-vm-tools:local /lab/boot.sh
```

本机 AMD 实验需要 `ignore_msrs=Y` 才能完成恢复系统启动。原值为 N，测试后恢复；这是共享 WSL 内核的临时参数，不应在其他 VM 运行时随意变更：

```powershell
wsl -d Debian -u root -- cat /sys/module/kvm/parameters/ignore_msrs
# 仅在开始本轮实验并记录原值后设置：
wsl -d Debian -u root -- sh -c 'echo 1 > /sys/module/kvm/parameters/ignore_msrs'
# 客体正常关机、全部本轮 VM 停止后恢复：
wsl -d Debian -u root -- sh -c 'echo 0 > /sys/module/kvm/parameters/ignore_msrs'
```

工具链准备使用 Apple 软件更新目录中的 Command Line Tools 16.4（产品 `082-41241`，要求 macOS 15.3–15.x），校验记录见[下载清单](../../tests/reports/2026-10-09-windows-vm/clt-download.json)。目录中的 `Digest` 是 XAR 压缩 TOC 的 SHA-1，不是整个包的 SHA-1；本轮另行校验了归档数据摘要并记录整个文件的 SHA-256。是否已经在客体安装和构建成功，以测试报告为准。

## CLT 下的同源断言补充验证

本轮 CLT 16.4 可构建 SwiftUI，但缺少 XCTest / Testing 模块。常规 `swift test` 的失败日志保留；正式 XCTest 应使用包含对应测试框架的完整 Xcode 环境再次执行。

`build-portable-tests.py` 从两个测试文件提取未修改的同步方法体；`portable-assertions.swift` 只适配本轮使用的六种断言，失败立即终止，不实现 XCTest 生命周期、异步或测试发现语义。生成器遇到不支持的 API 会拒绝生成，不能作为通用 XCTest 替代品。

```sh
# 仓库根目录生成，再将文件送入 macOS 客体
python products/sonadeck/experiments/windows-vm/build-portable-tests.py /tmp/portable-checks.swift
# macOS 中，先在 SonaDeckPrototype 目录完成 bash build-app.sh
bash /path/to/run-portable-macos.sh /tmp/portable-checks.swift
# 可用 Swift 6 环境：检查适配器正向断言及七个故意失败的负向控制
bash products/sonadeck/experiments/windows-vm/validate-portable-assertions.sh
```

执行器链接原生构建得到的 ProfileDomain 和 PrototypeModel 对象。结果必须标为“同源同步断言”，不报告成 XCTest 通过。

## 音频验证限制

WSLg 的 PulseAudio socket 可传入容器，以 `pactl list short sinks` 检查。枚举到 RDPSink 只证明转发端点可达，不等于 USB/蓝牙设备被客体直接识别，也不等于实际声音、时延或音质通过。

真实音频失败可以在本次实验中记录为环境限制；配置状态误报、草稿丢失等功能错误不能因此豁免。SwiftUI、菜单栏、辅助功能及动画必须有原生运行证据，Linux 单测和恢复系统截图均不能替代。
