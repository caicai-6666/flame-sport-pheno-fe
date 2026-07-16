# Flame Winter Pheno

Flame Winter Pheno 是一个面向企业健康挑战场景的移动端 Web 应用原型。项目围绕“运动项目选择、凭证上传、积分排行、上传历史、积分商城”构建完整闭环，用于展示员工在赛季内参与运动挑战、提交凭证、获得积分并兑换奖品的核心体验。

当前版本以前端交互和 UI 原型为主，业务数据暂时使用组件内 mock 数据，后续可以平滑替换为接口数据。

## 核心功能

- 项目选择
  - 展示当前赛季可选运动项目。
  - 最多锁定 3 个运动。
  - 已锁定项目在首页高亮展示。
  - 达到锁定上限后，未锁定项目不可继续选择。

- 项目详情
  - 展示每个运动项目的青铜、白银、黄金挑战规则。
  - 支持锁定运动，并带有礼花反馈动画。
  - 已锁定后才允许上传运动凭证。
  - 上传弹窗支持图片选择、预览和备注。
  - 减重挑战支持月初/月末记录类型和 BMI 输入。

- 排行榜
  - 通过横向柱状图展示总积分排行。
  - 默认展示积分前 15 名员工。
  - 当前用户会高亮展示。
  - 如果当前用户在 15 名开外，会展示省略号和当前位置。

- 上传历史
  - 展示当前赛季所有项目凭证上传记录。
  - 记录按上传时间倒序排列。
  - 支持展示普通运动凭证和减重挑战 BMI 信息。

- 积分商城
  - 按积分档次展示可兑换奖品。
  - 支持兑换前二次确认，防止误触。
  - 兑换成功后触发礼花动画。
  - 积分扣减使用平滑数字动画。
  - 支持查看兑换记录，记录按兑换时间倒序排列。

## 技术栈

- Vue 3
- Vue Router 4
- Vue CLI 5
- JavaScript
- Scoped CSS
- CSS 动画与响应式布局

项目当前未引入额外 UI 组件库。页面流转由 Vue Router 管理，原型共享状态集中在 `state/appState.js`，主要交互动效通过原生 Vue 状态和 CSS 动画实现。

## 目录结构

```text
src/
  App.vue                # 应用布局：顶部栏、路由出口、底部导航
  main.js                # Vue 入口，挂载 Router
  assets/
    logo.png
  router/
    index.js             # 路由配置
  state/
    appState.js          # 原型共享状态与 mock 数据
  views/
    ProjectHomeView.vue  # 项目列表路由页
    ProjectDetailView.vue # 项目详情路由页
    RankView.vue         # 排行榜路由页
    HistoryView.vue      # 上传历史路由页
    ShopView.vue         # 积分商城路由页
  components/
    BottomNav.vue        # 底部导航
    HeaderBar.vue        # 顶部品牌栏
    ProjectHome.vue      # 项目选择 UI
    ProjectDetail.vue    # 项目详情、锁定、凭证上传 UI
    RankPage.vue         # 积分排行榜 UI
    HistoryPage.vue      # 上传历史 UI
    ShopPage.vue         # 积分商城与兑换记录 UI
concept/
  项目.png
  项目内.png
  排行.png
  历史.png
  商城.png
  挑战规则.png
```

## 本地开发

### 安装依赖

```bash
npm install
```

### 启动开发服务

```bash
npm run serve
```

启动后根据终端输出访问本地地址，通常为：

```text
http://localhost:8080
```

### 生产构建

```bash
npm run build
```

构建产物会输出到：

```text
dist/
```

### 代码检查

```bash
npm run lint
```

## 关键交互说明

### 运动锁定

锁定状态由 `state/appState.js` 统一维护，路由页再通过 props 下发给 `ProjectHome.vue` 和 `ProjectDetail.vue`。这样可以保证：

- 在详情页锁定项目后，首页同步高亮。
- 锁定数量达到 3 个后，其他未锁定项目会自动禁用。
- 已锁定项目仍可进入详情查看和上传凭证。

### 凭证上传

`ProjectDetail.vue` 内部维护上传弹窗状态。提交时通过 `submit-proof` 事件向父组件传递上传信息，父组件会把记录写入上传历史。

当前提交数据结构包括：

```js
{
  taskName: '跑步/快走',
  fileName: 'run-proof.png',
  recordType: 'daily-proof',
  bmi: '',
  note: '晚间快走 4km'
}
```

减重挑战会额外使用：

- `recordType: 'month-start' | 'month-end'`
- `bmi`

### 兑换记录

`ShopPage.vue` 内部维护当前积分、商品配置和兑换记录。兑换成功后会：

- 扣减可用积分。
- 触发积分数字动画。
- 添加一条新的兑换记录。
- 触发对应兑换按钮的礼花动画。

## 数据接入建议

当前项目的跨页面原型状态集中在 `state/appState.js`，排行榜和商城仍保留组件内 mock 数据，适合原型演示。进入真实业务开发时，建议拆分为以下接口：

- `GET /api/tasks`：获取赛季运动项目。
- `POST /api/tasks/:id/lock`：锁定运动项目。
- `POST /api/proofs`：上传运动凭证。
- `GET /api/proofs/history`：获取当前赛季上传历史。
- `GET /api/rankings`：获取积分排行榜。
- `GET /api/rewards`：获取商城奖品。
- `POST /api/rewards/:id/redeem`：兑换奖品。
- `GET /api/rewards/exchanges`：获取兑换记录。

同时建议把用户信息、锁定状态、积分余额、上传历史和兑换记录迁移到统一状态层或接口缓存层，避免组件间直接耦合业务数据。

## 浏览器兼容

项目使用 Vue Router 管理页面流转，并使用部分现代 CSS 能力，例如：

- `color-mix`
- `backdrop-filter`
- CSS 自定义属性
- CSS animation

目标环境应为现代移动端浏览器。若需要兼容较旧浏览器，需要为上述样式增加降级方案。

## 后续可扩展方向

- 接入真实用户登录态。
- 上传凭证接入对象存储或后端文件服务。
- 增加凭证审核状态。
- 增加兑换确认弹窗和库存校验。
- 增加历史记录筛选和按项目过滤。
- 增加排行榜周期筛选，例如周榜、月榜、赛季榜。
- 将 mock 数据抽离到独立 fixture 或 API 层。
