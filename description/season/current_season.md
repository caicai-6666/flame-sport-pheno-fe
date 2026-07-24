# 当前赛季

## 相关文件

```text
src/views/ProjectHomeView.vue
src/api/season.js
src/state/appState.js
```

## 接口

```http
GET /season/current
```

请求参数：无。

推荐响应：

```json
{
  "season_id": "2026-07",
  "name": "2026年7月赛季",
  "start_date": "2026-07-01",
  "end_date": "2026-07-31",
  "required_project_count": 3
}
```

兼容包装：

```json
{
  "season": {
    "season_id": "2026-07",
    "name": "2026年7月赛季",
    "start_date": "2026-07-01",
    "end_date": "2026-07-31",
    "required_project_count": 3
  }
}
```

### 无激活赛季

当没有进行中的赛季时，接口返回 `404`。这是正常业务语义，不表示接口地址不存在：

```json
{
  "code": "NO_ACTIVE_SEASON",
  "message": "当前暂无激活赛季"
}
```

前端仅在 `GET /season/current` 收到此语义的 `404` 时进入 `unavailable`（敬请期待）状态；其他接口的 `404` 仍按普通请求错误处理。

## 前端用途

前端将赛季信息用于：

- ProjectHome 顶部赛季名称与日期展示
- 商城根据赛季起止日期计算前 N 个自然日的兑换窗口
- 控制用户需要锁定的项目数量
- 后续 `/project/lock_check`
- 后续 `/project/lock`
- 后续 `/project/lock_level`
- 后续 `/proof/upload`

前端使用 `seasonAvailability` 区分 `loading`、`active`、`unavailable` 和 `error`，不能用报名状态 `seasonParticipationStatus` 代替。无激活赛季时仍允许浏览项目、项目规则、过往历史、商品与积分流水；所有赛季报名、锁定、上传、兑换和当前赛季排行操作均不可执行。

展示格式：

```text
赛季名称 · MM.DD-MM.DD
```

普通接口失败时，前端保留默认文案“当前赛季”，并将部分依赖赛季 ID 的操作阻断；无激活赛季时则明确展示“新赛季敬请期待”。
