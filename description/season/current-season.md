# 当前赛季

本文说明当前赛季接口、无激活赛季语义以及赛季状态在前端各模块中的用途。

## 相关文件

```text
src/views/ProjectHomeView.vue
src/api/season.js
src/state/appState.js
```

---

## `GET /season/current` 获取当前赛季

### 接口定义

```http
GET /season/current
```

### 请求参数

无。

### 成功响应

推荐响应如下：

```json
{
  "season_id": "2026-07",
  "name": "2026年7月赛季",
  "start_date": "2026-07-01",
  "end_date": "2026-07-31",
  "required_project_count": 3,
  "server_time": "2026-07-01T08:00:00+08:00",
  "user_write_frozen": true,
  "user_write_freeze_starts_at": "2026-07-01T00:00:00+08:00",
  "user_write_available_at": "2026-07-02T00:00:00+08:00"
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
    "required_project_count": 3,
    "server_time": "2026-07-01T08:00:00+08:00",
    "user_write_frozen": true,
    "user_write_freeze_starts_at": "2026-07-01T00:00:00+08:00",
    "user_write_available_at": "2026-07-02T00:00:00+08:00"
  }
}
```

### 异常处理

当没有进行中的赛季时，接口返回 `404`。这是正常业务语义，不表示接口地址不存在：

```json
{
  "detail": "当前没有激活的赛季"
}
```

前端仅在 `GET /season/current` 收到此语义的 `404` 时进入 `unavailable`（敬请期待）状态；其他接口的 `404` 仍按普通请求错误处理。

---

## 前端用途

前端将赛季信息用于：

- ProjectHome 顶部赛季名称与日期展示
- 商城根据赛季起止日期计算前 N 个自然日的兑换窗口
- 控制用户需要锁定的项目数量
- 后续 `/project/lock_check`
- 后续 `/project/lock`
- 后续 `/project/lock_level`
- 后续 `/proof/upload`

### 赛季配置保护期

客户前端通过构建期变量 `VUE_APP_ACTIVE_SEASON_CONFIG_EDIT_WINDOW_HOURS` 配置保护期小时数，并根据当前赛季 `start_date` 从上海时区当日 `00:00` 起算。开发联调时，该值应与客户后端 `.env` 中的 `ACTIVE_SEASON_CONFIG_EDIT_WINDOW_HOURS` 保持一致；未提供有效前端配置时，前端回退使用后端响应中的保护期边界和冻结状态。

后端同时通过当前赛季响应提供服务端时间、当前只读状态、保护期起点和开放时间。前端将这些字段归一化为 `serverTime`、`userWriteFrozen`、`userWriteFreezeStartsAt` 和 `userWriteAvailableAt`，其中服务端时间用于校准浏览器时间轴。

前端使用 `server_time` 校准响应抵达后的时间轴，不直接信任用户设备的绝对时间。保护期内展示剩余整小时提示，并阻止项目锁定、挑战等级锁定、凭证上传和商品兑换；保护期结束后，页面停留期间也会自动恢复操作入口。前后端变量必须保持一致，且前端判断只用于用户提示，后端事务内强校验始终是最终权限依据。

保护期是内部业务概念。用户界面统一展示“本赛季将在 N 小时后正式开始”，并说明项目内容可以提前查看，不展示“赛季配置中”等管理员语义。

健康资料提交和意见提交不属于保护范围。项目列表、挑战规则、活动详情、历史记录、排行信息、商品和积分流水等读取内容继续开放。

前端使用 `seasonAvailability` 区分 `loading`、`active`、`unavailable` 和 `error`，不能用报名状态 `seasonParticipationStatus` 代替。无激活赛季时仍允许浏览项目、项目规则、过往历史、商品与积分流水；所有赛季报名、锁定、上传、兑换和当前赛季排行操作均不可执行。

展示格式：

```text
赛季名称 · MM.DD-MM.DD
```

普通接口失败时，前端保留默认文案“当前赛季”，并将部分依赖赛季 ID 的操作阻断；无激活赛季时则明确展示“新赛季敬请期待”。

读取接口单次等待 15 秒；超时后公共请求层会在 400 ms、800 ms 后最多自动重试两次。三次均超时才进入上述普通失败状态，业务语义 `404` 不会重试。
