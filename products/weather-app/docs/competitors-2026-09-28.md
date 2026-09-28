# 海外 Windy 免费替代品调查

核验日期：2026-09-28。阶段：竞品研究；未安装全部 App、未购买订阅、未验证预报准确率或商业收入。范围以大陆以外用户、Android 和可替代移动应用的 Web 产品为主。功能依据官网、官方商店和项目仓库；商店描述属于开发者声明，不能代替实测。

当前产品要求与研究路线以[产品首页](../README.md)为准；范围变化见[决策记录](decisions.md)。

## 1. 结论

**有，而且免费替代品已经覆盖地图、多模型、日常天气和部分远期查询。** 最直接的对照是 Ventusky、Zoom Earth、Flowx；户外场景还有 Windfinder、PredictWind、蓝色 Windy.app。Windy.com 自己的免费版也必须作为竞争基线。

不能把“提供免费功能”“全部免费”“免费且无广告”混为一谈。多数地图产品采用免费加订阅；Weawow 的 App 免费无广告，以自愿捐赠支持；Breezy Weather 是免费开源 Android 应用。较新的 VeriSky 已将免费模型比较、预报回看与准确度评分做成产品。

“看广告换高级天气功能”已有 Shadow Weather 先例；“免费 30 天预报”也有 Weather30 的商店声明。但本轮没有确认一个同时满足“Windy 级地图与多模型体验、一个月趋势、专门看激励广告解锁远期预报”的成熟产品。**未确认这一组合，不等于市场空白，更不等于可以盈利。**

## 2. 直接或较接近的替代品

时效是产品展示范围，不代表每个模型、图层和地区都能覆盖同样天数，也不代表对应天数具有相同准确度。

| 产品 / 入口 | 核心用途 | 免费与收费边界 | 对本项目的意义 |
| --- | --- | --- | --- |
| [Windy.com（红色）](https://www.windy.com/articles/43434) | 全球气象地图、地点预报、多模型 | 免费版存在；官方当前对比列出免费每日两次更新、标准 3 小时步长；Premium 提供更多模型更新、1 小时步长和最长 15 天等 | 第一竞争基线：不能把 Windy 当作只能付费使用的产品；仍未证实它有 30 天逐日预报 |
| [Ventusky](https://my.ventusky.com/premium/features) | 动态气象地图、多模型、海洋与高空图层 | 桌面端所列高级图层前 6 天免费，超过 7 天预报地图属 Premium；Android/iOS 所列高级图层需 Premium，但部分图层的长时效地图免费 | 最接近的地图竞品之一；网页和 Android 收费边界明显不同，不能用网页体验推定 App |
| [Zoom Earth](https://play.google.com/store/apps/details?id=com.neave.zoomearth) | 卫星、雷达、飓风、风雨温度地图 | 免费下载，Play 标注广告和内购，提供 Pro 订阅；模型包括 ICON、GFS。Android 各图层免费最远时效本轮未实测 | 全球地图和天气过程追踪的强对照；不能再笼统称为完全免费 |
| [Flowx](https://flowx.io/help/pro/) | 时间轴天气地图与图表，适合比较天气过程 | 免费 7 天，含多种全球数据；Gold 最长 16 天、更多区域模式与编辑功能；官方[商业模式](https://flowx.io/business/)声明无广告 | “免费地图＋多模型”已存在；长时效和区域高分辨率是其收费点 |
| [Windfinder](https://www.windfinder.com/apps) | 风、浪、潮汐与水上运动地点 | 官网列 10 天、3 小时间隔预测；基本功能免费；Plus 增加 Superforecast、高级地图和去广告等 | 如果目标是帆船、风筝冲浪，需要比较地点实况与活动决策，不能只比预报天数 |
| [PredictWind](https://explore.predictwind.com/pricing) | 航海、风浪、航线与出发时机 | 有 $0 免费层，含风浪等；更高分辨率与航行工具分付费层；免费仅[两个保存地点](https://help.predictwind.com/en/articles/3202202-how-many-saved-locations-can-i-have) | 免费入口加专业服务的成熟对照；不能把专业航线功能算作免费 |
| [Windy.app（蓝色）](https://windy.app/pro) | 风和户外运动、地点、模型比较 | 免费加 Pro；官方[模型选择说明](https://windy.app/news/all-models-feature.html)明确 GFS 是默认免费模型；多个[模型产品](https://windy.app/support/windy-app-weather-forecast-models.html)展示至 10 天 | 与红色 Windy 不是同一个产品；它也是竞争者，不能误计为红色 Windy 的版本 |
| [earth.nullschool.net](https://earth.nullschool.net/about.html) | 全球风场、海洋、大气可视化 | Web 可免费浏览；官网列出 GFS 等数据来源。本轮未核验官方原生 Android 应用与各层最远时效 | 免费全球可视化的参照，但日常地点预报工作流不等同于 Windy |

## 3. 与“免费、可信、多模型、长时效”定位有关的产品

| 产品 | 已核实的能力与商业方式 | 边界 |
| --- | --- | --- |
| [Weawow](https://weawow.com/i/aboutus) | App 无广告，支持多来源，自愿捐赠维持；官网另说明网站登录后不显示广告 | 日常天气替代品；不能把 App 的无广告声明直接扩展到匿名网页，也未确认所有供应商均无条件免费 |
| [Breezy Weather](https://github.com/breezy-weather/breezy-weather) | 免费开源 Android 应用，日/小时预报最长 16 天、多来源、组件、无追踪器；可使用 Open-Meteo | 源与地区决定实际时效；README 明确不发布到 Google Play，雷达仍列在可行性研究中；不是完整 Windy 地图替代品 |
| [VeriSky](https://play.google.com/store/apps/details?hl=en&id=com.verisky.app) | 免费全球模型选择、同时比较、预报回看、地点模型评分；声明无广告；Pro 增加商业预报源、更多地点验证、部分临近降雨和运动时段选择 | 2026-09-27 更新的商店文案已经是免费加订阅，不能继续引用早期“所有功能免费”宣传；评分方法与质量未独立验证 |
| [Weather30](https://play.google.com/store/apps/details?hl=en&id=com.nowinnov.weather) | 商店描述称全球 30 天逐日预报、完全免费 | 仅确认产品存在与其宣传；未查明上游模型、校验结果、广告机制。页面没有足够依据支持“看广告解锁 30 天”的说法 |
| [Shadow Weather](https://shadowweather.com/terms-and-privacy) | 官方条款明确涉及订阅或观看广告取得 Premium，并说明 Web 不支持广告奖励 | 证明广告换高级功能有先例；本轮未实测当前 Android 奖励有效期、广告频次或最远预报天数，不能称为已验证的 30 天解锁竞品 |

VeriSky 还公开了[验证方法](https://verisky.app/methodology/)与[事后预报评估报告](https://verisky.app/)。这意味着“告诉用户最近哪个模型更准”也已有专门产品；本地模型评分只能支持特定观测、变量、样本和预报提前量，不能直接当成普遍准确率排行榜。

meteoblue 可作为补充功能参照，但 Windyty 已[取得其多数股权](https://community.windy.com/topic/33666/windyty-s-e-acquires-majority-stake-in-meteoblue-a-g)，不宜把它算作完全独立于红色 Windy 集团的竞争者。

## 4. 对拟议定位的判断

以下是研究推断，不是用户已经选定的方案。

| 拟议卖点 | 已有覆盖 | 判断 |
| --- | --- | --- |
| 免费查看气象地图 | Windy 免费版、Ventusky、Zoom Earth、Flowx、earth | 不构成独立差异点；需明确免费开放哪些原本收费的能力 |
| 免费多模型比较、表达分歧 | VeriSky 等；蓝色 Windy 也有模型比较产品 | 单靠把多个 API 摆在一起不足以形成明显区分 |
| 免费较长预报 | Breezy 最长 16 天；Weather30 宣传 30 天 | “天数更多”已有供应；关键是科学表达、数据质量和实际决策价值 |
| 看广告获取高级能力 | Shadow Weather 官方条款已有记录 | 可作为变现实验，但新颖性有限，盈利情况未知 |
| 2–6 周出行目的地趋势比较 | 本轮尚未充分覆盖完整竞品组合 | 值得继续研究的用户任务，不能宣布未被满足或没有竞品 |

广告能否承担成本仍需实验。Flowx 的[FAQ](https://flowx.io/help/faq/)自述曾尝试横幅、视频广告、低价订阅和一次性购买，未能覆盖成本。这只是一个开发者的经验，不能推导所有天气广告模式都不可行；但它直接提醒我们核算目标国家广告收入、数据许可、瓦片带宽和用户查询频率。

初步单位经济应按“每活跃用户的实际广告收入 − 数据与瓦片服务成本 − 其他可变成本”估算。没有地域、广告填充率、完成率和访问量时，不填写虚构收益，也不假定 Open-Meteo 的公共免费接口可以支撑广告商业应用。许可问题沿用[数据源报告](data-source-research-2026-09-28.md)的核验要求。

## 5. 原始用户需求线索

1. [r/weather：寻找超过 Ventusky 时效的长时效地图](https://www.reddit.com/r/weather/comments/1wp28sf/longrange_forecast_map_similar_to_ventusky/)：帖主描述提前约两周选择欧洲旅行目的地，接受三周预测只能粗略参考，希望比较整个大陆。这是具体的“选目的地”任务，不只是要求更多天数。
2. [r/sailing：PredictWind、Windy、WindHub 比较](https://www.reddit.com/r/sailing/comments/1sdsago/weather_apps_predictwind_windy_windhub/)：讨论中有用户组合天气 App、本地天气和官方海况信息；另有免费 Windfinder 的使用反馈。提示用户可能需要交叉确认与实况，而不是统一追求最长预测。

这两条是定性线索，不代表需求规模、付费或看广告意愿。没有用开发者自荐帖子数量、下载量或讨论热度推算收入。

## 6. 下一轮建议与研究限制

优先实际拆解 **Windy 免费版、Ventusky、Flowx、VeriSky、Shadow Weather**，Zoom Earth 作为地图体验补充。用同样的地点、日期和任务测试：免费能看到哪里、模型如何切换、远期是否说明不确定性、收费/广告在何处出现、离线与加载失败如何处理。尚未执行 Android 真机测试。

再从一个具体任务选原型，例如“比较几个旅行目的地未来数周趋势”。先验证用户是否比起已有免费 App 更愿意使用它，再决定是否加入激励广告。仍需补查旅行、路线天气和公共气象机构的专项产品，不能依据本轮横向清单直接确定市场切入点。

本轮不做应用实现、不购买服务，不将“大陆以外”视为已选定具体国家，也不据此给出全球通用的法律结论。

## 7. 检索记录

- OpenCLI：读取 live 注册表与 Google 命令帮助后执行 Google 搜索 2 次；关键词分别为 `Windy free alternatives Ventusky Zoom Earth earth nullschool Android weather maps` 和 `free Android weather app 30 day forecast weather maps rewarded ads Ventusky Weawow Breezy Weather VeriSky`。
- 补充核验：通过网页检索与直接访问核对官网、Google Play、App Store、GitHub 和原始 Reddit 讨论。针对 Windy.app、Shadow Weather 广告奖励、Flowx 套餐进一步查证；不把聚合下载站作为能力结论的主要依据。
- 以上是定向竞品扫描，非全球市场穷尽调查。所有链接为本次证据入口；价格、地区可用性、免费额度及界面会变化。
