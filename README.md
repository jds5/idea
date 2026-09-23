# 独立软件开发计划

这是一个管理多个独立软件研究、产品定义和开发计划的仓库。每个产品独立规划、验证和交付；第一个产品是 **SonaDeck**。

主要面向海外用户，同时利用中文社区的用户沟通与反馈优势。是否选择 Mac、是否加入 AI、是否采用订阅，都由具体产品的用途和验证结果决定。

## 产品目录

| 产品 | 定位 | 当前阶段 | 入口 |
| --- | --- | --- | --- |
| SonaDeck | Mac 应用音量与输出管理，保存多套音频配置并一键切换 | 首期规划已建立；尚未实现或通过真机验证 | [产品首页](products/sonadeck/README.md) |

## 仓库结构

```text
.
├── README.md                     # 仓库定位与产品索引
├── AGENTS.md                     # 全仓库协作规则
├── research/                     # 跨产品研究与历史选题依据
├── templates/
│   └── product-brief.md           # 新产品立项模板
└── products/
    └── sonadeck/
        ├── README.md             # 当前状态、文档入口、下一步
        └── docs/
            ├── product-spec.md   # 首期范围与用户任务
            ├── profiles.md       # 配置数据与切换语义
            ├── experience.md     # Mac 界面、交互、动画
            ├── technical-plan.md # 系统版本、音频路线、分发
            ├── roadmap.md        # 阶段、任务与完成条件
            ├── validation.md     # 兼容性、可靠性、性能验收
            └── decisions.md      # 决策状态、证据与待验证问题
```

产品实现开始后，在对应产品下按需创建 `app/`（应用工程）、`experiments/`（技术实验）、`tests/`（工程外测试资料）和 `assets/`（设计源文件）。不预建空工程，不在根目录混放多个应用。实际工程内部可以采用 Xcode/Swift Package 的标准测试布局。

## 阅读与工作方式

1. 先读 [AGENTS.md](AGENTS.md)，再进入目标产品首页。
2. 按“用户任务 → 首期范围 → 关键风险验证 → 实现 → 真机验收”推进。
3. 产品需求、设计假设、已验证事实分开记录；计划完成不代表产品完成。
4. 新产品复制 [立项模板](templates/product-brief.md)，创建独立目录并更新本页索引。除非已经存在真实复用需求，不提取跨产品框架。

当前仅包含研究和规划文档，没有可运行应用，也没有统一的构建或测试命令。每个产品开始实现后，在自己的 README 中维护准确命令和环境要求。

## 既有研究

- [独立软件方向研究](research/indie-software-opportunities-2026-09-23.md)
- [AI 时代的方向复评](research/indie-software-ai-reassessment-2026-09-23.md)

历史报告保留原始日期，不把过去的社区反馈当作竞品当前缺陷。SonaDeck 是本轮选定的首个项目，不代表其他方向被永久排除。
