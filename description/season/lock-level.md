# 锁定挑战等级

本文说明用户完成项目选择后统一锁定赛季挑战等级的前置条件、接口契约和交互状态。

## 相关文件

```text
src/views/ProjectHomeView.vue
src/components/ProjectHome.vue
src/api/projects.js
src/state/appState.js
```

---

## 业务前置条件

用户需要先锁定当前赛季要求数量的项目：

```text
lockedTaskNames.length >= season.required_project_count
```

前端随后取一个已锁定项目，请求 `/project/rules`，从规则中拿到可选等级的 `project_rule_level_id`。

---

## `POST /project/lock_level` 锁定挑战等级

### 接口定义

```http
POST /project/lock_level
```

### 请求参数

请求体如下：

```json
{
  "season_id": "2026-07",
  "project_rule_level_id": "1"
}
```

字段说明：

| 参数名                  | 类型              | 是否必填 | 说明        |
| ----------------------- | ----------------- | -------: | ----------- |
| `season_id`             | `string / number` |       是 | 当前赛季 ID |
| `project_rule_level_id` | `string / number` |       是 | 挑战等级 ID |

### 成功响应

前端以 HTTP 2xx 作为成功依据，不强依赖响应体。

推荐：

```http
204 No Content
```

### 异常处理

不满足项目锁定数量、报名已经截止或请求字段无效时，后端应返回非 `2xx` 和明确的 `message`；前端进入“锁定失败”状态后恢复可选。

---

## 前端交互

挑战等级按钮状态参考：

```text
等级名 -> 确认等级 -> 锁定中 -> 报名成功
```

失败时：

```text
锁定中 -> 锁定失败 -> 恢复可选
```

成功后：

- `selectedChallengeLevel` 写入本地状态
- `seasonParticipationStatus` 更新为 `participated`
- 报名进度推进到“报名成功”
