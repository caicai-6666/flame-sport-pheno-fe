# ProjectDetail 项目详情

## 组件位置

```text
src/views/ProjectDetailView.vue
src/components/ProjectDetail.vue
src/api/projects.js
src/api/season.js
src/state/appState.js
```

## 当前 real data 范围

ProjectDetail 当前已接入：

- `GET /project/rules`
- `POST /project/lock`
- 必要时补请求 `GET /season/current`
- 必要时检查 `GET /season/participate_check`

## 获取项目挑战规则

```http
GET /project/rules?project_id=running
```

推荐响应：

```json
[
  {
    "project_rule_level_id": "1",
    "name": "青铜挑战",
    "reward": 100,
    "sub_desc": "完成基础有氧里程",
    "rule_content": [
      {
        "label": "累计距离",
        "value": "25km"
      }
    ],
    "rule_note": "跑步或快走均可累计"
  }
]
```

兼容包装：

```json
{
  "levels": []
}
```

前端处理：

- `project_rule_level_id` 保存在挑战等级对象中
- `name` 直接展示为挑战名称
- 从 `name` 中去掉末尾“挑战”得到等级名，用于高亮当前选中等级
- `rule_content` 支持数组或 JSON 字符串
- 根据 `reward` 升序展示等级
- 请求进行中展示与卡片同尺寸的加载占位，避免规则区域留白；数据返回后，挑战卡片按列表顺序每隔约 90ms 从右侧滑入。
- 系统开启“减少动态效果”时，加载与滑入动画应降级为静态展示。

## 锁定项目

```http
POST /project/lock
```

请求体：

```json
{
  "season_id": "2026-07",
  "project_id": "running"
}
```

成功响应：

```http
204 No Content
```

前端处理：

1. 用户首次点击进入“确认锁定”
2. 二次点击后请求 `/project/lock`
3. 按钮显示“锁定中”
4. 成功后写入本地锁定状态
5. 失败时按钮短暂显示“锁定失败”

## 报名截止限制

详情页会复用 `seasonParticipationStatus`。如果状态为 `closed`：

- 锁定按钮显示“报名已截止”
- 不发起 `/project/lock`

## 无激活赛季限制

详情页始终重新请求 `GET /season/current`，不信任路由 query 中可能遗留的 `seasonId`。如果接口返回无激活赛季 `404`：

- 项目介绍和挑战规则继续可见；
- 锁定按钮显示“赛季敬请期待”并禁用；
- 辅助提示说明当前仅支持浏览规则，赛季开放后才能锁定项目；
- 不发起 `POST /project/lock`。

## 当前未接入

项目详情基础信息仍来自首页项目列表和路由参数，没有单独请求项目详情接口。
