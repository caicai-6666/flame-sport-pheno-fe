# 前端接口与页面说明索引

## 当前 real data 范围

当前项目已完成“项目”主页面及其子页面的 real data 接入，覆盖以下流程：

```text
应用启动登录
获取当前赛季
检查赛季参与状态
获取项目列表
获取当前赛季已锁定项目
进入项目详情
获取项目挑战规则
锁定项目
锁定统一挑战等级
获取项目上传配置
上传项目凭证
```

仍处于 mock 或半 mock 的页面：

- `HistoryPage`：当前赛季上传列表仍来自 `appState.uploadRecords`，上传成功后由前端即时追加。
- `PastSeasonReviewPage`：过往赛季审核记录仍来自本地 mock。
- `RankPage`：排行榜主体仍是本地 mock 员工列表。
- `ShopPage`：商品、积分余额、积分变动仍是组件内 mock。

## 文档结构

```text
description/
  README.md

  auth/
    login.md
    header_bar.md

  conventions/
    api_response.md

  project/
    project_home.md
    project_detail.md
    upload_proof.md

  season/
    current_season.md
    participation.md
    lock_level.md

  history/
    README.md

  rank/
    README.md

  shop/
    README.md
```

## 阅读顺序

项目页联调建议按以下顺序阅读：

1. `conventions/api_response.md`
2. `auth/login.md`
3. `season/current_season.md`
4. `season/participation.md`
5. `project/project_home.md`
6. `project/project_detail.md`
7. `season/lock_level.md`
8. `project/upload_proof.md`

## 维护约定

- 每个 real data 迁移任务完成后，需要同步更新对应业务域文档。
- 请求字段优先使用数据库描述中的 snake_case。
- 前端可保留少量 camelCase 兼容逻辑，但文档推荐格式应保持统一。
- 页面级文档只描述页面数据编排和交互状态；接口细节放入对应业务文档。
