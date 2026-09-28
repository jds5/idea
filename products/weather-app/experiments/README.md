# Open-Meteo 接口可行性实验

核验日期：2026-09-28。用途：研究阶段的非商业评估。未购买服务，未使用账号凭证。

## 复现

从仓库根目录在 PowerShell 执行：

```powershell
$experimentPath = (Resolve-Path 'products/weather-app/experiments').Path
docker run --rm --mount "type=bind,source=$experimentPath,target=/work" -w /work python:3.11-slim python probe_open_meteo.py --output results/local-run
```

`local-run/` 已忽略，避免重复运行覆盖归档。脚本仅用 Python 标准库，顺序执行 4 次 GET，单次超时 45 秒，无重试；保存响应、URL、单位、覆盖、非空数量、耗时和 SHA-256。访问的是公开评估接口，商业应用应按供应商条款选择正式服务。

本轮环境：Windows 宿主、Docker Server 29.8.0、Linux 容器 Python 3.11.16。所用镜像摘要：`python@sha256:1042b61448fef4ba92d16a8c7eb4996d027568ce64792a7877fd88511e0af7c6`。标签可能更新，严格复现环境应使用摘要；实时 API 数据本身必然随时间变化。

## 已观察结果

[完整统计](results/2026-09-28/summary.json)，请求时间约为 2026-09-28 01:24–01:25 UTC。

| 请求 | HTTP | 日期行数 | 数据序列 | 每条序列有效数 | 最后有效日期 |
| --- | --- | --- | --- | --- | --- |
| 北京，短期 daily | 200 | 16 | 3 | 16 | 2026-10-13 |
| 北京，EC46 daily | 200 | 46 | 153（3 变量 × 51） | 45 | 2026-11-11 |
| 北京，EC46 weekly | 200 | 7 | 2 | 6 | 2026-11-02（周起始标签） |
| 柏林，EC46 daily | 200 | 46 | 51 | 45 | 2026-11-11 |

4 次请求均完成、数组与时间轴长度一致。单次耗时约 2.26–2.81 秒，仅是该网络和时点的观察，不能作为 SLA 或端上延迟估计。

北京 EC46 返回格点坐标约为 39.76581, 116.55738，与请求 39.90, 116.40 不同。API 接收任意经纬度不代表在该点有独立高分辨率观测或模拟。

逐日最后一天 2026-11-12 为 null；周数据最后一个标签 2026-11-09 为 null。原因未通过起报元数据确认，不能武断归因。应用必须按实际非空覆盖显示，不根据 `forecast_days` 参数制造数据。

每日返回的无 `_memberNN` 后缀字段不能自动视为集合均值；本次请求模型为 `ecmwf_ec46`，包含成员序列。集合均值应显式选择均值模型或按可用成员计算。周距平是另一种聚合产品，不应因为只返回一条序列就视为一个集合成员。

## 证据边界

- 没有做预报准确率检验；尚未到达的有效日期无法由本次请求验真。
- 普通短期请求采用默认模型选择；未证明其等于 Windy 当前模型或融合算法。
- `generationtime_ms` 是响应生成耗时，不是模型起报时间；HTTP Date 也不是起报时间。
- 未验证商业端点、持续可用性、原生 Android、生产并发、降水概率校准或全球覆盖。
- 使用不同 IANA 时区验证了请求可接受；尚未系统验证夏令时逐小时聚合边界。

## 数据来源与许可

原始 JSON 来自 [Open-Meteo](https://open-meteo.com/)，采用 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。EC46 文件基于 [ECMWF](https://www.ecmwf.int/) 数据；本服务/研究基于 European Centre for Medium-Range Weather Forecasts (ECMWF) 的数据和产品。ECMWF 不对数据的错误、遗漏、可用性或其使用造成的损失负责。此处不暗示机构认可本研究。

原始响应未修改；`summary.json` 为提取覆盖统计后的衍生结果。普通短期接口还可能组合其他模式，具体来源范围见 [Forecast API](https://open-meteo.com/en/docs)。数据许可、托管 API 使用条款、开源服务器代码许可是不同层次，不能互相替代。
