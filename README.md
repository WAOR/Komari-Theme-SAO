<p align="center">
  <strong>面向多种探针服务端的SAO系列探针主题</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
  <img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen" alt="Node Version">
  <img src="https://img.shields.io/badge/TypeScript-Strict-blue" alt="TypeScript">
</p>

<p align="center">
  <img src="./preview.png" alt="Theme Preview" width="100%">
</p>

> ⚠️ **项目声明**  
> 本项目为个人基于开源社区优秀成果进行的二次开发与定制分支。  
> 若您正在寻找上游原版或希望探索更多衍生分支，建议前往并支持原作者的项目：
> - 初代设计项目：[stqfdyr/komari-theme-Lumina](https://github.com/stqfdyr/komari-theme-Lumina)
> - 功能增强上游：[shanyang242/Komari-Theme-LuminaPlus](https://github.com/shanyang242/Komari-Theme-LuminaPlus)
> - 社区移植参考：[volcano-1025/CFSM-Theme-LuminaPlus](https://github.com/volcano-1025/CFSM-Theme-LuminaPlus) / [guboysky/LuminaPlus](https://github.com/guboysky/LuminaPlus)

---

## 📜 主题族谱与演进脉络

本项目前端界面的设计思路与代码结构演进关系如下：

```text
[初代设计] komari-theme-Lumina (作者: @stqfdyr)
    │
    ▼
[功能扩展] Komari-Theme-LuminaPlus (作者: @shanyang242 / @shark)
    │   ├─ 引入背景图/动态壁纸、透明度调节、首页文字评级、Ping/负载图表等特性
    │   └─ 社区移植探索：
    │       ├─ @volcano-1025 (移植至 CF-Server-Monitor)
    │       └─ @guboysky (移植至 Monitor-Probe)
    │
    ▼
[SAO 家族定制分支] Theme-SAO 系列 (作者: @WAOR)
    ├─ Komari-Theme-SAO   : 适配 Komari 探针
    ├─ CFSM-SAO           : 适配 CFSM 探针
    └─ Monitor-SAO        : 适配极简探针
```

---

## ⚡ 核心通用特性

### 1. 加载速度优化

- **早期数据并行预取**：
  - 通过内联脚本与静态资源并行发起配置与节点信息请求，减少传统单页应用中“HTML ➔ 脚本加载 ➔ 脚本执行 ➔ 接口请求”带来的瀑布流等待。
- **立体骨架屏秒级占位**：
  - 在首屏数据抵达前渲染与真实仪表盘结构对齐的呼吸骨架，缓解空白页面等待感。
- **构建分包优化**：
  - 将趋势图表库等重型组件进行拆包与按需异步加载，控制首屏主脚本体积。

### 2. 界面设计与视觉体验

- **双栏总览仪表盘**：
  - **核心指标区**：汇总活跃链接、平均 CPU、内存用量、硬盘用量、今日流量及资产信息等指标。
  - **集群状态看板（右侧核心区）**：
    - **分段式在线健康指示格**：直观展示全站在线百分比与离线台数，采用单机一格的矩阵式状态方块映射节点存活状态（健康绿/离线灰）。
    - **双轨实时网络吞吐波形图**：拆分独立且对称的「上行」与「下行」实时波形卡片，采用轻量原生 SVG 贝塞尔平滑曲线与微发光渐变填充；内置动态自适应整值标尺算法，确保 Y 轴刻度规整稳定不跳跃，高帧率滑动窗口流畅呈现流量脉冲。
    - **健康状态胶囊与带宽评级徽章**：顶部配备联动式呼吸状态胶囊（状态健康 / 存在离线预警），并根据瞬时全站网络吞吐动态映射带宽活跃度等级。
- **护眼浅色与纯粹深色体系**：
  - **浅色模式**：采用分层浅灰底色配合立体悬浮卡片，降低明亮背景下的眩光感。
  - **深色模式**：采用中性碳黑基调，避免杂色泛蓝，暗光环境下视觉更加沉浸。

### 3. 运维细节与隐私防护

- **敏感数据受控隐藏**：默认对未登录访客隐藏节点费用与资产总值信息；管理员可在设置中开启向访客展示资产信息，也可通过顶部导航栏的快捷按钮临时切换显隐资产信息，方便截图分享。

### 4. 自适应布局优化

- 针对移动端和桌面端小窗口布局优化，确保各种窗口尺寸下吞吐波形图都能正常展示不被折叠压缩；主题对 iOS 灵动岛安全区进行沉浸式适配，无论是浅色还是深色模式，灵动岛区域与页面主体都保持完全一致的色彩阶梯。

---

## 🧩 各版本专属特性与差异说明

由于不同探针后端的数据结构和能力存在差异，各版本针对性地保留并优化了以下功能：

### 1. Komari 版本基准 ([Komari-Theme-SAO](https://github.com/WAOR/Komari-Theme-SAO))

- **基准主题，目前是最满血的 SAO 系列主题。**
- **默认隐藏资产数据**：默认对未登录访客隐藏节点费用与资产总值信息；管理员可手动开启向访客展示资产信息，同时也提供快捷按钮快捷临时显/隐资产信息，便于截图分享。
- **灵动流光昵称与动态语境问候语**：在首页总览仪表盘顶部，主题设计了一套融合时段关怀与渐变光效的问候体系：
  - **首屏流光掠过（Sweep Layer）**：首屏初次渲染时用户昵称通过一道包含洋红、橙红、暖黄、紫罗兰与深蓝的多色光谱光带沿 110° 角度自左向右掠过字形，平滑完成初次亮相。
  - **常态极光微流动（Aurora Layer）**：入场流光结束后，昵称无缝过渡至 135° 多色极光背景，以 8 秒为周期在字形内部保持缓慢、低饱和度的微流动呼吸效果，长时间停留观感自然克制。
- **时段问候与集群状态动态语境**：
  - 自动识别当前时间，动态根据集群实时在线率智能切换贴切的状态提示。
- **昵称展示**：
  - 未登录访客固定展示为 `Guest`；
  - Komari 版本登录后可自动读取登录用户名。
- **延迟测速线路数量配置**：
  - 相较于 LuminaPlus，SAO 不限制首页展示的延迟槽位数量（仅限大卡和小卡）。
- **重构暗色模式**：
  - 按照个人喜好以碳黑色为基调重构暗色模式，个人十分满意当前的暗色模式。
- **更多细节优化**：
  - 对一些上游主题遗留下来的细枝末节的功能进行完善和优化，不值得单独列出。

### 2. CFSM 版本差异 ([CFSM-SAO](https://github.com/WAOR/CFSM-SAO))

- **彩色标签智能着色语法**：
  - 支持在后台节点备注中使用 `标签名-颜色` 格式（如 `香港BGP-blue`、`特惠机-red`、`CN2-green`）指定标签色彩。未指定颜色后缀时，系统会根据线路关键词智能匹配适宜的色系。
- **用户名可自定义**：
  - 由于 CFSM 探针并未输出用户名字段，因此相较于 Komari 版本，CFSM 版改为了手动编辑用户昵称，存储到 D1 数据库当中，你可以直接点击昵称处编辑，也可以在主题设置中编辑。
- **受限于特性的功能缺失**：
  - 受限于 Workers 免费额度限制，每日流量统计和峰值统计等功能在 CFSM 上无法准确统计，因此缺失此部分功能。

### 3. 极简探针版本差异 ([Monitor-SAO](https://github.com/WAOR/Monitor-SAO))

- **服务端配置标准持久化**：
  - 适配极简探针最新版本主题配置持久化接口，主题配置得以跨设备统一生效。
- **用户昵称可自定义**：
  - 由于极简探针压根就不存在用户名，因此极简探针版主题采取了 CFSM 版同样的处理方式，你可以直接点击昵称处编辑，也可以在主题设置中编辑。
- **提供了公告栏功能**：
  - 可以通过公告栏向访客留言，未填写公告则不会展示公告栏。

#### 极简探针版主题待完善功能

- **当前主题无法准确记录瞬时峰值**：
  - 极简探针服务端历史数据采用 1 分钟或 5 分钟时间片平均加权落库。一次 15 秒的测速突发与后续 45 秒的闲置状态在服务端落库时会被整窗口平摊，短时间的突发测速结束后，服务端只记录平摊均值所以会导致峰值数值下降。
  - 目前 SAO 主题只能在前端通过 WebSocket 实时推流捕获当日瞬时最高速率，并锁存在浏览器本地存储中（无法向其他访客展示）保证日常开盘测速期间峰值数据准确展示。
  - 若测速期间完全未打开网页，补读时仍受限于服务端时间片均值，要想实现准确的峰值记录，需待 monitor-probe 后端提供峰值数据后主题再进行适配。
- **节点标签功能缺失**：
  - 极简探针目前未提供节点标签（Tags）字段，因此原 Komari 体系下和 CFSM 体系下的线路色彩药丸标签功能暂处于冻结状态，待后端支持后主题会更新适配。

---

## 🚀 安装与部署

请根据您使用的探针服务端类型选择对应的安装方式：

### Komari
1. 前往 [Komari-Theme-SAO Releases](https://github.com/WAOR/Komari-Theme-SAO/releases) 下载对应主题压缩包。
2. 在 Komari 后台主题管理中上传启用。

### Monitor-Probe（极简探针）
1. 前往 [Monitor-SAO Releases](https://github.com/WAOR/Monitor-SAO/releases) 下载最新版本的打包产物 `theme.tar.gz`。
2. 在极简探针后台主题设置页面上传启用。

### CF-Server-Monitor (CFSM)
在 CFSM 管理后台「系统设置」→「主题管理」中填入以下地址：
```text
# 追踪最新发布版（推荐）：
https://github.com/WAOR/CFSM-SAO/tree/dist

# 或指定特定 Commit 锁定生产版本：
https://github.com/WAOR/CFSM-SAO/tree/<40位CommitSHA>
```

---

### 📌 特别说明

SAO 系列主题的「视频背景」和「图片背景」相关功能完全继承上游主题，对于探针面板这种高密度信息聚合页面，使用「视频背景」和「图片背景」比较干扰阅读。不排除可能有人喜欢，所以保留着。但对于其在 SAO 系列主题上的展现效果我不做任何保证。

---

## 💖 致谢

感谢以下优秀开源项目与社区贡献者的付出：
- **[stqfdyr/komari-theme-Lumina](https://github.com/stqfdyr/komari-theme-Lumina)**：初代优雅主题开创者。
- **[shanyang242/Komari-Theme-LuminaPlus](https://github.com/shanyang242/Komari-Theme-LuminaPlus)**：出色的增强分支与功能架构设计。
- **[volcano-1025/CFSM-Theme-LuminaPlus](https://github.com/volcano-1025/CFSM-Theme-LuminaPlus)**：CFSM 平台的早期移植探索。
- **[guboysky/LuminaPlus](https://github.com/guboysky/LuminaPlus)**：Monitor 探针平台的移植尝试。
- **[Montia37/komari-theme-purcarte](https://github.com/Montia37/komari-theme-purcarte)**：动态背景视频的设计与参考素材。
- **[komari-monitor/komari](https://github.com/komari-monitor/komari)**、**[CF-Server-Monitor](https://github.com/CF-Server-Monitor)** 与 **[monitor-probe/monitor](https://github.com/monitor-probe/monitor)**：探针监控服务端的作者及社区维护者。

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 开源发布。
