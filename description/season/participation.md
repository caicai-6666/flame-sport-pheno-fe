# 赛季参与状态

本文说明赛季参与状态接口的状态码语义，以及各状态对项目首页和详情页的影响。

## 相关文件

```text
src/views/ProjectHomeView.vue
src/views/ProjectDetailView.vue
src/api/season.js
src/state/appState.js
```

---

## `GET /season/participate_check` 查询参与状态

### 接口定义

```http
GET /season/participate_check
```

### 请求参数

Query 参数如下：

| 参数名      | 类型              | 是否必填 | 说明        |
| ----------- | ----------------- | -------: | ----------- |
| `season_id` | `string / number` |       是 | 当前赛季 ID |

### 成功响应

#### `200` 已经参与

推荐响应：

```json
{
  "project_rule_level_id": "1"
}
```

前端处理：

- 设置 `seasonParticipationStatus = participated`
- 保存 `projectRuleLevelId`
- 如果尚无等级名称，会在获取 `/project/rules` 后根据 ID 补齐展示名

### 异常处理

#### `409` 报名中

```http
409 Conflict
```

前端处理：

- 设置 `seasonParticipationStatus = registering`
- 显示报名进度条
- 允许继续锁定项目
- 锁定数量达标后允许选择挑战等级

#### `403` 报名截止

```http
403 Forbidden
```

前端处理：

- 设置 `seasonParticipationStatus = closed`
- 首页显示报名截止结果卡片
- 项目详情页锁定按钮不可点击

---

## 页面影响

ProjectHome 根据该状态决定显示：

- 状态检查中
- 报名进度条
- 报名成功结果
- 报名截止结果

ProjectDetail 根据该状态决定项目锁定按钮是否可用。
