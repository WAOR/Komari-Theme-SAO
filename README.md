<p align="center">
  <strong>面向多种探针服务端的 SAO 系列探针主题</strong>
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
> 本项目为个人基于开源社区成果进行的二次开发与定制分支。  
> 若您正在寻找上游原版或探索更多分支，建议前往支持原作者项目：
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

### 1. 极致加载速度优化

- **早期数据并行预取**：在 HTML `<head>` 阶段通过内联脚本并行发起数据请求，彻底告别单页应用常见的串行等待。
- **立体骨架屏秒级占位**：在首屏真实数据抵达前渲染结构对齐的呼吸骨架，有效缓解页面等待空白感。
- **构建按需分包加载**：对图表库等重型依赖异步拆包加载，严格控制首屏核心脚本体积。

### 2. 界面设计与视觉体验

- **双栏总览仪表盘**：
  - **核心指标区**：汇总活跃连接、CPU、内存磁盘占用、今日流量与资产等运维指标。
  - **集群状态看板（右侧核心区）**：
    - **分段式在线健康指示格**：直观呈现全站在线率与离线数量，采用单机一格的状态方块映射节点存活（健康绿 / 离线灰）。
    - **双轨实时网络吞吐波形**：对称呈现上行与下行独立波形，采用轻量原生 SVG 贝塞尔曲线绘制；内置整值自适应标尺算法，高帧率平滑呈现瞬时网络脉冲。
    - **状态呼吸胶囊与带宽评级**：配备联动呼吸状态胶囊（健康 / 离线），根据全站瞬时总吞吐动态映射等级徽章。

- **护眼浅色与纯粹深色体系**：
  - **浅色模式**：采用分层浅灰底色搭配立体悬浮卡片，降低明亮背景下的视觉眩光刺激。
  - **深色模式**：采用中性碳黑基调重构，避免杂色泛蓝，暗光环境下更具极客沉浸感。

### 3. 运维细节与隐私防护

- **敏感资产数据受控隐藏**：默认对未登录访客隐藏节点费用与资产总值。管理员登录后可在设置中开启展示，或通过顶栏快捷按钮一键切换临时显隐，便于安全截图分享。

### 4. 响应式布局与移动端适配

- **弹性多端自适应**：深度优化移动端与桌面小窗口布局，确保不同窗口尺寸下网络吞吐波形均能舒展呈现，避免组件挤压折叠。
- **iOS 灵动岛全景融合**：针对全面屏安全区深度适配，顶栏背景色自然蔓延覆盖至状态栏与灵动岛背后，无论深浅色皆浑然一体，消除顶部色彩断层。

---

## 🧩 各版本专属特性与差异说明

由于不同探针后端的数据结构差异，各版本针对性保留并优化了以下特性：

### 1. Komari 版本基准 ([Komari-Theme-SAO](https://github.com/WAOR/Komari-Theme-SAO))

- **功能最完整的基准版本**：作为 SAO 系列功能完备的旗舰基准实现。
- **默认资产保密机制**：默认对访客隐藏敏感费用，支持后台开启展示或快捷临时切换。
- **灵动流光昵称与动态语境问候**：
  - **首屏流光入场（Sweep Layer）**：首屏初次渲染时用户昵称由多色光谱光带自左向右掠过字形，平滑完成初次亮相。
  - **常态极光呼吸（Aurora Layer）**：流光结束后无缝过渡至低饱和度多色极光背景，以 8 秒为周期保持缓慢微流动态，长时间停留舒适耐看。
- **时段关怀与语境联动**：自动感知本地时段，根据在线率智能切换契合的状态问候。
- **智能昵称读取**：访客固定展示为 `Guest`，登录后自动读取并展示实际用户名。
- **无限制延迟测速槽位**：相较上游分支，不限制首页测速线路展示数量（支持大小卡）。
- **个性化碳黑暗色重构**：以中性碳黑色为核心基调深度重构暗色主题，提供纯粹克制的夜间视觉体验。
- **细节打磨与边界优化**：全面修复并优化上游遗留的各处排版微瑕与组件边界细节。

### 2. CFSM 版本差异 ([CFSM-SAO](https://github.com/WAOR/CFSM-SAO))

- **彩色标签智能着色**：支持在后台节点备注中使用 `标签名-颜色` 格式（如 `香港BGP-blue`、`特惠机-red`）自定义标签色彩；未指定颜色时系统将基于关键词自动匹配适宜色系。
- **自定义管理员昵称**：因 CFSM 探针原生未下发用户名字段，本版本支持站长自定义昵称并持久化保存至 D1 数据库，可在首页直接点击编辑或在后台统一配置。
- **受限平台功能说明**：受限于 Cloudflare Workers 免费配额与请求计费模型，每日流量汇总统计与历史峰值记录在此版本中暂不提供。

### 3. 极简探针版本差异 ([Monitor-SAO](https://github.com/WAOR/Monitor-SAO))

- **服务端标准配置持久化**：深度适配探针官方配置持久化接口，确保各项设置跨设备自动同步生效。
- **用户昵称自由定制**：后端无原生用户名特性，支持自定义昵称，可在首页点击修改或后台统一配置。
- **轻量置顶公告栏**：提供站长公告广播位，方便向访客留言；未配置内容时自动折叠不占页面空间。

#### 极简探针版待完善功能说明

- **瞬时测速峰值记录机制**：
  - **服务端加权平摊限制**：极简探针历史数据采用 1 分钟或 5 分钟时间片平均加权落库。短时突发测速与闲置周期会被均摊，导致突发结束后统计均值回落。
  - **前端临时锁存补偿**：主题目前通过 WebSocket 推流实时捕获当日瞬时最高速率并锁存在本地，保障日常测速期间数据精准展示。
  - **后续跟进规划**：离线补读仍受限于时间片均值，待探针后端原生支持峰值字段后将第一时间适配。
- **节点标签功能暂未支持**：因当前极简探针后端尚未提供节点标签（Tags）字段，原线路色彩药丸标签功能暂处于冻结状态，待后端接口支持后主题将更新适配。

---

## 🚀 安装与部署

请根据您使用的探针服务端类型选择对应的安装方式：

### Komari
1. 前往 [Komari-Theme-SAO Releases](https://github.com/WAOR/Komari-Theme-SAO/releases) 下载对应主题压缩包；
2. 在 Komari 后台主题管理中上传并启用。

### Monitor-Probe（极简探针）
1. 前往 [Monitor-SAO Releases](https://github.com/WAOR/Monitor-SAO/releases) 下载最新版本的打包产物 `theme.tar.gz`；
2. 在极简探针后台主题设置页面上传并启用。

### CF-Server-Monitor (CFSM)
- **方式一：主题商店一键启用（推荐）**  
  登录 CFSM 后台前往「主题商店」，找到 **SAO** 主题点击启用即可。
- **方式二：手动添加仓库地址（锁定特定版本）**  
  在「主题商店」中填入以下地址安装：
  - 追踪最新发布版：`https://github.com/WAOR/CFSM-SAO/tree/dist`
  - 锁定特定 Commit：`https://github.com/WAOR/CFSM-SAO/tree/<40位CommitSHA>`

---

> 📌 **特别说明：关于多媒体背景**  
> SAO 系列主题的「动态视频背景」与「图片背景」功能完整继承自上游项目。鉴于探针面板属于高密度信息看板，强视觉背景易对文字阅读造成干扰，主题对其在不同设备下的展现效果不做额外保证。如需更深度的个性化视觉效果，欢迎 Fork 仓库自行定制拓展。

---

## 💖 致谢

感谢以下优秀开源项目与社区贡献者的付出：
- **[stqfdyr/komari-theme-Lumina](https://github.com/stqfdyr/komari-theme-Lumina)**：初代优雅主题开创者。
- **[shanyang242/Komari-Theme-LuminaPlus](https://github.com/shanyang242/Komari-Theme-LuminaPlus)**：出色的功能增强分支与架构设计。
- **[volcano-1025/CFSM-Theme-LuminaPlus](https://github.com/volcano-1025/CFSM-Theme-LuminaPlus)**：CFSM 平台的早期移植探索。
- **[guboysky/LuminaPlus](https://github.com/guboysky/LuminaPlus)**：Monitor 探针平台的移植尝试。
- **[Montia37/komari-theme-purcarte](https://github.com/Montia37/komari-theme-purcarte)**：动态背景视频的设计与参考素材。
- **[komari-monitor/komari](https://github.com/komari-monitor/komari)**、**[CF-Server-Monitor](https://github.com/CF-Server-Monitor)** 与 **[monitor-probe/monitor](https://github.com/monitor-probe/monitor)**：探针监控服务端的作者及社区维护者。

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 开源发布。
