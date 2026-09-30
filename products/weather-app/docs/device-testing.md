# 同一 Wi-Fi 下的 Android 真机测试

更新：2026-09-30。用户已授权本 PC 上的 Docker 服务端与局域网手机测试；不是公网发布，不部署 NAS、VPS 或 Cloudflare。

## 本次准备的地址

- 手机浏览器入口：**http://192.168.232.191:8790/test**。
- 直接下载 APK：**http://192.168.232.191:8790/test/dayward-debug.apk**。
- App 的 Gateway origin：**http://192.168.232.191:8790**。
- 仅 PC 可用的 Docker 检查入口：**http://127.0.0.1:18790/test**。
- PC 接口：WLAN，当前地址 `192.168.232.191/24`；当前 Windows 网络类别为 Public。

这组地址属于本次本地环境，不是正式服务地址。DHCP 换地址后需要重新运行准备脚本。该 PC 使用 Docker Desktop / WSL2；本轮实测容器发布的单独 Wi-Fi IP 和通配绑定都未提供可用的 Wi-Fi 入口，而回环访问成功。因此最终 Docker 只发布到 `127.0.0.1:18790`，由下述管理员脚本建立 Windows `192.168.232.191:8790 → 127.0.0.1:18790` 端口转发，并配置防火墙本地子网规则。手机不要使用电脑的 localhost，也不要使用 Android 模拟器专用地址 `10.0.2.2`。

## 防火墙这一步

本轮代理进程不是 Windows 管理员，不能写入防火墙和系统端口转发；实测当前各配置文件默认入站为 Block，未找到 Dayward 8790 放行规则或对应端口转发。下面这条命令**尚未执行，需要用户在管理员 PowerShell 完成**；执行前手机入口不能视为就绪。服务运行、PC 回环自测成功不能证明手机可达。

在电脑上打开**管理员 PowerShell**，执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\yaoch\IdeaProjects\idea\products\weather-app\scripts\allow-lan-firewall.ps1" -Address 192.168.232.191 -Port 8790
```

这会建立上述单端口转发，并给当前 Wi-Fi 接口、PC 的指定地址、TCP 8790 添加本地子网入站允许规则，不关闭防火墙、不更改网络类别。脚本先检查 Docker 回环健康状态，再配置并检查 Wi-Fi 地址上的健康状态。`ExecutionPolicy Bypass` 只用于这一次子进程执行仓库中的本地脚本，不修改系统永久执行策略。规则名 `Dayward-LAN-Test-8790`。

测试结束后需要撤销规则，在管理员 PowerShell 使用同一命令追加 `-Remove`。

## 手机上如何开始

1. 保持手机与电脑在同一 Wi-Fi，电脑保持唤醒，Docker Desktop 运行。
2. 手机浏览器打开上面的 `/test` 页面。页面会显示安装包大小/校验值、六城采集时间和测试步骤。
3. 下载 APK，按 Android 的安装提示允许当前浏览器安装此测试包。要求 Android 9/API 28 或以上。
4. 首次安装已预填当前 PC 地址。若覆盖安装旧版，旧设置被保留：进入 **Setup → Gateway origin** 填写当前地址，点 **Connect gateway**。
5. Weather 选 London → Load collected forecast → 未来开始时刻、持续时间与偏好 → Inspect this window → 保存计划。
6. Plans → View saved forecast → Check against latest collection。退出并重开 App 后，保存计划应仍存在。
7. 手机断开 Wi-Fi 后查看已保存基线；刷新应明确报错。恢复连接后再次复查，最后按需删除测试计划。

预期限制：`Reference only / information incomplete` 不是连接失败；由于起报、原生分辨率和预警门槛未满足，当前不做自动推荐。同一轮缓存复查提示 `No newer collected snapshot`，不能据此认为天气经过再次确认。数据约每小时后台采集，App 的加载按钮只读取缓存。

没有自动采集诊断日志。反馈时记录手机型号、Android 版本、失败步骤、错误原文与采集时刻；私有计划名称可遮挡。

## 可复现准备命令

仓库根目录的普通 PowerShell：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File products/weather-app/scripts/prepare-lan.ps1 -Address 192.168.232.191 -Port 8790
```

脚本会依次验证本机私网地址，在 Docker 内构建并测试 APK、写入安装包和 SHA-256 元数据，然后构建/启动 source、collector、gateway。使用已有天气缓存卷与 Debug 签名卷。失败时停止，不把旧包冒充本次成功构建。管理员运行时可自动配置上述转发与局域网规则；普通用户运行会明确提示尚未配置 Windows 网络入口。默认内部 Docker 端口为 18790，必要时可通过 `-BackendPort` 调整，需同步传给管理员脚本。

- `artifacts/lan.env`：本机绑定地址、端口和对外 origin，已忽略 Git。
- `artifacts/lan/dayward-debug.apk`、`build.json`：下载用安装包、版本、字节数、构建时刻和 SHA-256，已忽略 Git。
- `compose.lan.yaml`：仅本地测试启用 `/test`、`/test/status`、APK 下载，普通 Compose 模式这些接口返回 404。
- `dayward-android-home` 卷：持久化 Debug 签名。删除该卷可能导致以后生成不同签名，影响覆盖安装；不随手卸载 App 解决冲突，以免丢失计划。

日常启动/停止不必重复编译：

```powershell
docker compose --env-file products/weather-app/artifacts/lan.env -f products/weather-app/compose.yaml -f products/weather-app/compose.lan.yaml up -d
docker compose --env-file products/weather-app/artifacts/lan.env -f products/weather-app/compose.yaml -f products/weather-app/compose.lan.yaml logs --tail 30 collector gateway
docker compose --env-file products/weather-app/artifacts/lan.env -f products/weather-app/compose.yaml -f products/weather-app/compose.lan.yaml stop gateway collector source
```

停止不删除缓存或签名卷。早期的 `8787` Node 进程和 `8788` 预览容器不是手机测试入口，本轮独立使用 8790。

手动刷新一次真实天气（PC 操作，不向手机开放写入接口）：

```powershell
docker compose --env-file products/weather-app/artifacts/lan.env -f products/weather-app/compose.yaml -f products/weather-app/compose.lan.yaml run --rm --no-deps -e COLLECT_INTERVAL_SECONDS=0 collector
```

## 分层排错与验收边界

| 现象 | 检查 |
| --- | --- |
| 手机连 `/test` 都打不开 | PC IP 是否改变、防火墙规则、同一 Wi-Fi；访客 Wi-Fi/热点客户端隔离、VPN 或路由器隔离策略 |
| 页面能打开、App 失败 | Setup 的 origin 是否完全一致，是否当前 Debug 包；保留错误原文 |
| 页面显示 unavailable 或 stale | collector 日志、PC 对 AWS 数据端的连接；不会以模拟数据补位 |
| APK 下载失败/不完整 | 重新下载，与页面 SHA-256 对照；确认电脑没有休眠 |
| 覆盖安装失败 | 先核验包名/签名，不先卸载；记录 Android 的安装错误 |
| 保存计划重启后丢失 | 记录保存成功提示、是否清除存储/卸载；设备持久化属于本次待验收项 |

PC HTTP、Docker 内请求、编译和单元测试不能替代手机端连通、安装、触摸/辅助功能与进程重启验收。最终设备测试由用户在手机上执行并反馈；不记录为已完成。

## 本轮实际验证

- 后端 16 项测试通过，包括 LAN 模式默认关闭、缺包/缺数据状态、固定 APK 路径、下载内容与响应头；Android 9 项单元测试通过，Debug 构建成功，lint 0 errors / 7 warnings。
- 生成的 Debug `BuildConfig.DEFAULT_GATEWAY_URL` 已核对为 `http://192.168.232.191:8790`；安装包通过持久化 Debug 签名卷构建，APK 下载副本和原包 SHA-256 一致。
- Docker 回环入口的六城真实天气 smoke 检查通过；测试页显示六城缓存可用。PC Chrome 页面加载、状态刷新、地址复制与窄屏布局按本轮记录验证。
- Wi-Fi 入口在尚未配置 Windows 转发/防火墙时超时，已明确记录为待完成，而不是把回环成功写成手机可达。
- 运行产物在 `artifacts/lan/`，实际下载包校验值以测试页为准；这些大文件和本机 env 不提交到 Git。
