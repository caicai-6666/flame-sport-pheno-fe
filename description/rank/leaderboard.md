# 排行榜

## 相关文件

```text
src/views/RankView.vue
src/components/RankPage.vue
src/api/rank.js
src/state/appState.js
```

## 接口

```http
GET /leaderboard/info
```

请求参数：无。

推荐响应：

```json
[
  {
    "name": "测试用户B",
    "department_name": "研发一组",
    "project_rule_level_id": 2,
    "checkin_count": 15,
    "is_current_user": true
  }
]
```

兼容单条对象返回：

```json
{
  "name": "测试用户B",
  "department_name": "研发一组",
  "project_rule_level_id": 2,
  "checkin_count": 15,
  "is_current_user": true
}
```

## 字段映射

| 后端字段 | 前端字段 | 说明 |
| -------- | -------- | ---- |
| name | name | 用户名称 |
| department_name | departmentName | 部门名称 |
| project_rule_level_id | projectRuleLevelId | 用户当前赛季挑战规则等级 ID |
| checkin_count | checkinCount | 当前赛季累计打卡次数 |
| is_current_user | isCurrentUser | 是否为当前登录用户 |

## 页面展示

- 前端按 `checkinCount` 降序展示排行榜。
- 排行依据展示为“以本赛季通过初审的凭证为准（定时更新）”，明确榜单并非逐条凭证实时计算。
- 排名由前端基于排序后的列表计算。
- “我的排名”根据 `isCurrentUser` 定位，不再使用本地 mock 用户。
- 列表完整展示接口返回的所有用户，不裁剪为前 15 名，也不插入省略行。
- 前三名使用前端 CSS 奖牌展示，避免不同设备的 emoji 字体差异。
- `/rank` 路由开启 `KeepAlive`，底部导航切出再返回时不会重新创建页面组件。
- 请求加载中展示旋转加载动画和 shimmer 骨架条。
- 加载态最短保留 1 秒，避免接口过快返回时出现跳变。
- 请求完成后，“我的排名”卡片和排行列表使用渐入上浮过渡展示。

## 无激活赛季

排行榜进入时会先请求 `GET /season/current`。若返回无激活赛季 `404`，前端清空可能由 `KeepAlive` 保留的旧榜单，展示“新赛季敬请期待”，且不请求 `/leaderboard/info`。这样不会将上一赛季的排名误展示为当前排名。

## 临时等级映射

当前前端暂按 `project_rule_level_id` 做展示映射：

| project_rule_level_id | 展示等级 | 展示色 |
| --------------------- | -------- | ------ |
| 1 | 青铜 | 青铜色 |
| 2 | 白银 | 银色 |
| 3 | 黄金 | 金色 |
