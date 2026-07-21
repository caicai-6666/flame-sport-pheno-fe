# Flame Winter Pheno 项目概况

本文档是新会话 Agent 理解项目的首要入口。阅读本文后，应先根据任务所属业务域继续阅读对应文档，再开始修改代码。

项目的对外介绍、页面预览和启动命令位于仓库根目录的 [`README.md`](../README.md)。本文重点说明当前业务逻辑、前端编排、实现状态和文档导航。

## 项目定位

Flame Winter Pheno 是一个面向企业员工健康挑战的移动端 Web 应用，主要运行在钉钉 H5 环境。用户以赛季为单位参与活动，选择运动项目和统一挑战等级，上传运动凭证，查看审核记录与排行榜，并使用获得的积分兑换商品。

核心业务闭环如下：

```text
钉钉免登或开发环境登录
  -> 检查并采集必要的健康信息
  -> 获取当前赛季与可选项目
  -> 检查用户的赛季参与状态
  -> 锁定赛季要求数量的运动项目
  -> 为本赛季统一锁定挑战等级
  -> 按项目上传运动凭证
  -> 查看审核历史和排行榜
  -> 获取积分并在商城兑换商品
```

## 当前实现状态

项目已经从 UI 原型阶段进入真实接口联调阶段。以下流程已接入后端数据：

- 应用登录、401 自动重新登录和当前用户信息。
- 登录后的健康资料完整性检查与资料提交。
- 当前赛季、赛季参与状态和赛季要求的项目数量。
- 项目列表、项目规则、已锁定项目、项目锁定和统一挑战等级锁定。
- 项目上传配置、图片处理和凭证上传。
- 当前赛季及过往赛季的上传与审核记录。
- 当前赛季排行榜。
- 商城商品、商品图片、积分流水和商品兑换。

目前明确保留的模拟数据是 `HistoryPage` 中的赛季项目进度百分比。`src/state/appState.js` 仍包含部分原型初始记录，但历史页面加载后会使用真实接口结果覆盖或清空这些数据，不能将它们视为正式业务数据源。

## 关键业务规则

- 用户需要锁定的项目数量来自当前赛季的 `required_project_count`，不要在新增逻辑中固定写成 3。
- 挑战等级在一个赛季内统一选择一次，不是为每个运动项目分别选择。
- 用户锁定足够数量的项目后，才能锁定青铜、白银或黄金挑战等级并完成赛季报名。
- 赛季参与状态由 `/season/participate_check` 表达：`200` 为已参与，`409` 为报名中，`403` 为报名已截止。
- 项目锁定后才允许上传该项目的运动凭证。
- 上传表单由后端项目上传配置驱动；图片提交前会转换为 JPG，并压缩到 1 MB 以内。
- 当前赛季历史只在用户已参与该赛季时查询和展示；过往赛季记录独立查询。
- 排行榜按当前赛季有效打卡次数 `checkin_count` 排序，并根据 `is_current_user` 定位当前用户。
- 商城可用积分取最新一条积分流水的 `points_after`，兑换成功后使用接口返回余额更新页面。

## 前端编排

项目使用 Vue 3 Options API、Vue Router 4、Vue CLI 5、JavaScript 和 Axios，没有引入 UI 组件库或独立状态管理库。

```text
src/main.js
  -> 初始化登录
  -> src/App.vue
       -> 全局 Header、BottomNav、路由出口和全局面板
       -> src/router/
            -> src/views/       路由页面与业务数据编排
                 -> src/api/    请求、协议适配和数据归一化
                 -> src/state/  跨页面共享状态
                 -> components/ 页面呈现与交互状态
```

主要目录职责：

| 目录 | 职责 |
| --- | --- |
| `src/api/` | Axios 请求封装、鉴权、各业务域接口及后端数据归一化 |
| `src/views/` | 路由级数据加载、业务流程编排、错误状态和共享状态写入 |
| `src/components/` | 页面结构、局部交互、确认流程、动画、加载态和空状态 |
| `src/state/` | 使用 Vue `reactive` 维护登录、赛季、项目和跨路由业务状态 |
| `src/router/` | Hash Router、底部导航路由和 `KeepAlive` 页面缓存配置 |
| `src/utils/` | 不依赖组件的业务辅助逻辑 |

通常由 View 调用 API，再通过 props 向组件下发数据，组件通过事件通知 View。允许功能内聚的例外，例如上传面板自行加载上传配置并提交凭证、Header 自行获取头像、App 自行提交全局健康资料。

## 接口约定

- 业务请求由 `src/api/request.js` 自动添加 `Authorization: <auth_code>`，不使用 `Bearer` 前缀。
- 非登录接口返回 401 时，前端重新登录并自动重试原请求一次。
- 请求参数及推荐后端响应字段使用 snake_case。
- `src/api/` 将后端数据归一化为组件使用的 camelCase 模型。
- 联调阶段可有限兼容数组直出、对象包装或旧字段名，但文档中的推荐格式是目标契约。
- 页面组件不应重复解析后端字段；字段兼容和转换优先放在对应 API 模块。
- 统一错误对象包含 `message`、`status`、`data` 和 `originalError`。

完整约定参阅 [`conventions/api_response.md`](./conventions/api_response.md)。

## 文档导航

新 Agent 应先阅读本文和通用接口约定，再根据任务选择下面的业务文档，不需要无差别读取全部数据库文档。

### 登录与用户资料

1. [`auth/login.md`](./auth/login.md)：钉钉免登、开发登录、启动流程和 401 重登。
2. [`auth/health_profile.md`](./auth/health_profile.md)：健康资料检查、采集字段与保存交互。
3. [`auth/header_bar.md`](./auth/header_bar.md)：当前用户头像获取与资源释放。

### 赛季与运动项目

建议按以下顺序阅读：

1. [`season/current_season.md`](./season/current_season.md)：当前赛季及要求项目数量。
2. [`season/participation.md`](./season/participation.md)：报名中、已参与和报名截止状态。
3. [`project/project_home.md`](./project/project_home.md)：项目首页数据加载与完整报名流程。
4. [`project/project_detail.md`](./project/project_detail.md)：项目规则、项目状态和锁定操作。
5. [`season/lock_level.md`](./season/lock_level.md)：统一挑战等级的业务前置条件。
6. [`project/upload_proof.md`](./project/upload_proof.md)：上传配置、图片处理和凭证提交。

### 上传历史

1. [`history/README.md`](./history/README.md)：历史模块当前状态。
2. [`history/current_season_history.md`](./history/current_season_history.md)：当前赛季记录和展示条件。
3. [`history/past_season_review.md`](./history/past_season_review.md)：过往赛季审核记录。

### 排行榜

1. [`rank/README.md`](./rank/README.md)：排行榜模块当前状态与交互要求。
2. [`rank/leaderboard.md`](./rank/leaderboard.md)：排行榜接口、排序和当前用户展示规则。

### 积分商城

1. [`shop/README.md`](./shop/README.md)：商城模块当前状态。
2. [`shop/product_list.md`](./shop/product_list.md)：商品列表、积分分档和图片加载。
3. [`shop/point_flow.md`](./shop/point_flow.md)：积分流水和可用余额计算。
4. [`shop/exchange.md`](./shop/exchange.md)：兑换确认、提交和页面即时更新。

### 数据库设计

`description/db/` 按数据库表拆分文档。只有在修改接口字段、数据关系或后端契约时才需要阅读相关表：

| 业务域 | 相关文档 |
| --- | --- |
| 用户与部门 | `db/user.md`、`db/department.md` |
| 赛季报名 | `db/season.md`、`db/season_user.md` |
| 项目与等级 | `db/project.md`、`db/project_level.md`、`db/project_rule.md` |
| 用户锁定项目 | `db/season_user_project.md` |
| 上传配置与凭证 | `db/project_upload_config.md`、`db/proof_record.md` |
| 排行榜 | `db/leaderboard_snapshot.md` |
| 商城与积分 | `db/product.md`、`db/point_record.md` |

## 视觉资料

- `description/preview-image/` 保存当前主要页面预览图，适合快速确认整体视觉与页面结构。
- `concept/` 保存项目早期线框和挑战规则图，用于理解原始产品意图，不代表当前页面的最终像素实现。
- 修改页面时应以当前组件、业务文档和最新预览图共同作为依据。

## Agent 工作约定

- 开始任务前先检查当前工作树；项目可能存在尚未提交的联调改动，不要覆盖或回退无关修改。
- 修改业务行为前，先阅读对应 View、Component、API、State 和业务域文档，确认完整数据流。
- 每个真实数据迁移或接口契约变更完成后，同步更新对应业务文档和本文的实现状态。
- 页面级文档描述数据编排和交互状态；接口字段、请求和响应细节放在对应业务文档。
- 保持后端 snake_case、前端 camelCase 的边界，不把兼容字段扩散到组件层。
- 保留现有移动端布局、加载反馈、二次确认、错误恢复和动画节奏，除非需求明确要求改变。
- 完成代码修改后至少运行 `npm run lint`；涉及构建、依赖或跨模块修改时同时运行 `npm run build`。
