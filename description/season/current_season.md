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

## 前端用途

前端将赛季信息用于：

- ProjectHome 顶部赛季名称与日期展示
- 商城根据赛季起止日期计算前 N 个自然日的兑换窗口
- 控制用户需要锁定的项目数量
- 后续 `/project/lock_check`
- 后续 `/project/lock`
- 后续 `/project/lock_level`
- 后续 `/proof/upload`

展示格式：

```text
赛季名称 · MM.DD-MM.DD
```

如果接口失败，前端保留默认文案“当前赛季”，并将部分依赖赛季 ID 的操作阻断。
