# 免费商用来源与按需自托管实验

日期：2026-09-30。用途：小型可行性验证，不是准确率、负载或生产可靠性测试。结论用于[成本研究](../docs/cost-and-free-alternatives-2026-09-30.md)。

## 环境与范围

Windows 宿主、Docker Server 29.8.0，Linux/WSL2 容器。Python 3.11.16，仅使用标准库。测试地点为伦敦、柏林、纽约，不含用户私有位置。无账号、无 API 密钥、无购买、无 GPU。未下载或运行语言模型。

Python 镜像沿用 `python:3.11-slim`；本次实际镜像摘要另见[归档环境记录](results/2026-09-30-self-hosted-fixed/environment.json)。请求与返回时间均在 JSON 中；实时源会变化，重新运行不会得到相同天气。

## 官方 JSON 接口

脚本：[probe_free_sources.py](probe_free_sources.py)。最多 4 次顺序请求，每次超时 25 秒，响应上限 2 MB，不重试；应用 User-Agent 指向本仓库。保存原始 JSON、响应头、SHA-256 与覆盖统计。

从仓库根目录运行（输出目录必须尚不存在，以免覆盖原记录）：

```powershell
$weatherExperimentPath = (Resolve-Path 'products/weather-app/experiments').Path
docker run --rm --mount "type=bind,source=$weatherExperimentPath,target=/work" -w /work python:3.11-slim python probe_free_sources.py --output results/local-run/free-sources
```

[原始统计](results/2026-09-30-free-sources/summary.json)：

| 请求 | HTTP | 观察 |
| --- | --- | --- |
| MET Norway 伦敦 complete | 200 | 92 行，9 月 30 日 02:00 至 10 月 9 日 12:00 UTC；64 个 1 小时间隔、27 个 6 小时间隔 |
| MET Norway 柏林 complete | 200 | 同样 92 行与时间覆盖 |
| NWS 纽约 points | 200 | 取得该地点的小时预报 URL |
| NWS 纽约 hourly | 200 | 156 个小时区间，纽约当地 9 月 29 日 22:00 至 10 月 6 日 10:00 |

MET 两份样本各只有 64 行 `next_1_hours.precipitation_amount`，均未返回 `wind_speed_of_gust`。NWS hourly 包含降水概率，但未含雨量和阵风；不把概率当成雨量，下一步需查 grid data。

请求单次约 0.8–2.3 秒，只是此网络与时点的结果。数据发布与 HTTP 缓存头是不同时间，不能用响应 Date 充当模型起报时间。没有预警接入、模型独立性、连续日覆盖、缺失恢复或准确度验证。

## Open-Meteo 按需自托管

脚本：[probe_self_hosted.py](probe_self_hosted.py)。先查 AWS 目录，再对本地服务发起两项请求：伦敦 2 天、三模型、四变量；伦敦 EC46 46 天选择范围的两个周距平变量。超时每次 90 秒、响应上限 2 MB，输出按次保存。API 的逐小时输出不证明原模型每小时独立计算。

镜像：`ghcr.io/open-meteo/open-meteo@sha256:e1517a01a061fd96e2a9017d022c5809bb51725bcd733bcbed435e7ea32dd9da`，镜像标签版本 1.6.0，代码 revision `7988e4de62a3bf4e2ef4f3034a793af6e3bb3e84`，本地镜像约 1.02 GB。镜像本身不是天气模型权重。

实验只给 2 CPU、8 GiB 内存上限、512 MB 数据缓存，以及 1 GiB 临时文件系统，用于约束这几个请求的资源；不是生产容量建议，也不能取代官方至少 100 GB 存储的部署建议。容器只绑定 `127.0.0.1:18089`。

首次实验失败及修复：自定义 tmpfs 默认归 root 所有，实际进程为 UID/GID 999，写 `./data/cache.bin` 时触发权限错误并退出。重现时 ExitCode=132、OOMKilled=false，不能解释成硬件不支持或内存不够。改为 tmpfs `uid=999,gid=999,mode=0700` 后再测。保留[失败请求](results/2026-09-30-self-hosted/summary.json)、[日志](results/2026-09-30-self-hosted/configuration-failure.log)和[退出状态](results/2026-09-30-self-hosted/configuration-failure-state.json)。这是本次实验挂载配置的问题，不是官方正常卷配置一定有故障。

可复现启动配置如下；与既有同名容器冲突时先检查，不要删除不相关容器：

```powershell
docker run -d --name dayward-source-probe-fixed --memory 8g --cpus 2 --tmpfs /app/data:rw,size=1073741824,uid=999,gid=999,mode=0700 -e REMOTE_DATA_DIRECTORY=https://openmeteo.s3.amazonaws.com/data/ -e CACHE_SIZE=512MB -p 127.0.0.1:18089:8080 ghcr.io/open-meteo/open-meteo@sha256:e1517a01a061fd96e2a9017d022c5809bb51725bcd733bcbed435e7ea32dd9da
$weatherExperimentPath = (Resolve-Path 'products/weather-app/experiments').Path
docker run --rm --network container:dayward-source-probe-fixed --mount "type=bind,source=$weatherExperimentPath,target=/work" -w /work python:3.11-slim python probe_self_hosted.py --output results/local-run/self-hosted
```

完成后停止、移除本次具名实验容器即可，tmpfs 不留持久天气缓存。镜像可留供复现，不自动清理其他 Docker 资源。

### 修复后的实测结果

[首次有效查询](results/2026-09-30-self-hosted-fixed/summary.json)、[缓存后原样重查](results/2026-09-30-self-hosted-warm/summary.json)：

| 请求 | HTTP | 数据覆盖 | 冷查询 | 暖缓存查询 |
| --- | --- | --- | --- | --- |
| 三模型短期 | 200 | ECMWF IFS 0.25° / GFS / ICON，各 4 变量 × 48 小时；12 条序列全部非空 | 41.966 秒 | 0.007 秒 |
| EC46 周趋势 | 200 | 温度/降水距平，各 7 个周标签、6 个有效，末端为空 | 5.091 秒 | 0.006 秒 |

两个请求之间没有其他城市和生产用户，暖查询沿用同一容器和输入；计时来自 Python 客户端，不是服务器 `generationtime_ms`。不同模型、变量和时间跨度可能产生不同的缓存压力。短期虽然有 48 个 hourly 输出，也没有证明它们都是原生小时场，尤其不能用 IFS 插值结果绕过原规格的推荐条件。

周标签为 2026-09-28 至 2026-11-09；最后一个标签两变量均为 null。温度距平单位 K、雨量距平 mm，不能当成气温或日雨量；首个周标签早于查询日期，展示需保留完整原生周区间。本次未验证异常基准、成员和质量，因此尚不能上线作为经过验证的规划结论。

结束时 Docker stats 快照：内存约 526.2 MiB（限制 8 GiB），累计网络约收 4.81 MB / 发 219 kB，缓存目录占用约 512 MiB。该值不是峰值 RSS，不包含完整宿主/镜像开销，也不是每请求固定成本。缓存文件按配置分配，不能认为实际获取了 512 MiB 的气象数据。未做多地点、长时运行、更新周期切换或并发测试。

结果：按需获取开放数据的路线在本环境小样本下可用，不需要 GPU 或全球预报模型推理；首次冷读过慢，产品应通过共享结果缓存、预取活跃地点、异步刷新处理，不能让新用户一直等待。正式容量与官方建议仍待验证。本轮具名实验容器已经停止并移除，保留镜像和本目录证据。

## 许可与证据边界

MET 数据来自 [MET Norway](https://api.met.no/)，依据 [CC BY 4.0 / NLOD 2.0 与署名说明](https://api.met.no/doc/License)使用；原始 JSON 未修改，覆盖统计是衍生分析。

NWS 数据来自 [National Weather Service API](https://www.weather.gov/documentation/services-web-api)，官方允许免费用于任何目的，不暗示政府认可本产品。

Open-Meteo 开放数据采用 [CC BY 4.0](https://github.com/open-meteo/open-data)，查询软件采用 AGPL-3.0。ECMWF 相关数据基于 European Centre for Medium-Range Weather Forecasts (ECMWF) 的数据和产品；ECMWF 不对错误、遗漏、可用性或使用损失负责，不暗示认可。若获得其他模式结果，应同时保留 NOAA / DWD 来源与变换信息。

实验没有调用 Open-Meteo 的商业托管端点；公开目录可列出 EC46，不自动证明数据完整、新鲜、质量合格或未来永远免费。所有自托管结果必须连同资源配置、失败与限制一起理解。
