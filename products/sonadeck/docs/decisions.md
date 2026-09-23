# 决策、证据与待验证问题

更新日期：2026-09-23。

## 1. 用户已确认

| ID | 决定 | 依据 |
| --- | --- | --- |
| D01 | 仓库管理多个独立软件，SonaDeck 是第一个 | 本轮用户要求 |
| D02 | 项目名称为 SonaDeck | 用户选择 |
| D03 | 参考 SoundSource 类功能，支持保存多套配置并在主界面快速切换整套 | 用户明确的核心目标 |
| D04 | 关注 macOS 版本、UI 风格及动画流畅度 | 用户明确要求 |
| D05 | 扩展功能、AI 留到后续讨论 | 用户明确的阶段边界 |

## 2. 本轮规划默认（可调整，非全部用户确认）

| ID | 建议 | 理由 / 冻结时机 |
| --- | --- | --- |
| P01 | 原生 Swift / SwiftUI + 必要 AppKit | 优先 Mac 交互、资源与辅助功能；M1 原型验证 |
| P02 | macOS 15 起步，Apple Silicon 首发 | 减少初期兼容矩阵；M0 后依据实验和用户需求冻结 |
| P03 | 首选 Core Audio taps 音频路线 | 官方已有相关进程音频能力；完整控制仍需 M0 证明 |
| P04 | 首期聚焦音量、静音、单应用输出、系统设备选择与多配置 | 先交付完整闭环；EQ、AirPlay、AU 等后续单独规划 |
| P05 | 主窗口顶部直接切换 + 菜单栏快捷入口 | 对应高频场景切换；M1 / 用户内测验证 |
| P06 | 显式保存，临时调整与模板分离，保留草稿 | 快速切换与防止误覆盖兼顾；具体语义见 profiles |
| P07 | 设备缺失预检阻止切换，不静默改播其他设备 | 保持用户可预测的输出选择；运行中设备丢失的能力边界须实测 |
| P08 | 英文与简体中文首发，核心离线使用 | 面向海外并利用中文反馈渠道；不默认其构成市场壁垒 |
| P09 | 不提前选定 App Store 或直接分发 | 由沙盒、安装与核心能力实验确定 |

## 3. 仍需解决的问题

| 问题 | 获取答案的方式 | 时间点 |
| --- | --- | --- |
| 可用 Mac、系统版本和音频设备 | 记录开发 / 测试环境清单 | M0 开始 |
| tap 路线能否低成本实现稳定路由、恢复和沙盒支持 | SD-003–006 实验 | M0 |
| 最低实际小版本、是否有足够 Intel / macOS 14 需求 | 实验 + 目标用户访谈 | M0 结束 |
| 耳机断开或进程崩溃后是否可能由系统自动外放 | 故障实验，定义能力与限制 | M0 / M4 |
| 配置切换流程相对现有产品是否有足够实际价值 | 同一真实任务对比，不用预设功能存在与否推断 | M1 / M5 |
| SonaDeck 名称、域名和商店名称是否适合公开使用 | 单独进行品牌与重名核查 | 公开发布前 |
| 分发、收费、试用与更新方式 | 技术结论、成本和用户反馈 | M0 后初选，M5 前冻结 |

## 4. 本轮参考来源

核验日期：2026-09-23。沿用既有社区研究；本轮补充官方技术与平台资料，不重新扩展市场选题。没有实测竞品或本产品。

- [SoundSource 官方产品页](https://www.rogueamoeba.com/soundsource/)：参考应用音量、输出、系统设备和效果器等用途。它的全部能力不自动等于本期范围。
- [Apple：Core Audio taps 示例](https://developer.apple.com/documentation/coreaudio/capturing-system-audio-with-core-audio-taps)：音频路线的官方起点。捕获示例不是完整产品稳定性或沙盒可行性结论。
- [Apple：系统版本列表](https://support.apple.com/en-us/109033)：用于本轮版本矩阵；正式实施与发布时重新核验。
- [Apple：减少动态效果评估](https://developer.apple.com/help/app-store-connect/manage-app-accessibility/reduced-motion-evaluation-criteria)：辅助功能验收依据。本计划的毫秒和帧预算是产品目标。
- [Apple：App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)：关注 2.4.5、2.5.1、4.1、4.2、4.3；技术能力、产品差异与审核结果需分别判断。
- [Apple：macOS 公证](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)：直接分发路线的后续实现入口。
- [前期社区方向研究](../../../research/indie-software-opportunities-2026-09-23.md)与[AI 复评](../../../research/indie-software-ai-reassessment-2026-09-23.md)：保留选题背景、原始讨论与已注明的样本限制。

此前已发现同类产品存在配置 / profile 功能线索；本轮商店页面重访未成功，不对其当前版本重新下结论。后续对比应重新实测，不把“多配置”为本产品独有写入宣传。

## 5. 变更记录

| 日期 | 变更 | 状态 |
| --- | --- | --- |
| 2026-09-23 | 确定名称，建立多产品仓库结构与 SonaDeck 首期规划 | 文档已建立 |
| 2026-09-23 | 提出首期范围、配置语义、Mac 技术路线及验收门槛 | 待实现与验证 |

后续决策记录事实、理由和替代方案，不覆盖或伪造过去的实验结果。
