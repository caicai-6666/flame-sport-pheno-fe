# 健康信息采集

## 相关文件

```text
src/api/auth.js
src/api/userProfile.js
src/state/authState.js
src/state/userHealthProfileState.js
src/components/UserHealthProfilePanel.vue
src/App.vue
```

## 触发时机

登录成功后调用 `checkProfileComplete()`。

如果后端返回资料未完成且 `missing_fields` 非空，`App` 会展示 `UserHealthProfilePanel`。

## 完成度检查接口

```http
GET /auth/profile_complete_check
```

请求参数：无。

推荐响应：

```json
{
  "is_complete": false,
  "height_cm_completed": false,
  "missing_fields": ["height_cm"]
}
```

字段映射：

| 后端字段 | 前端字段 | 说明 |
| -------- | -------- | ---- |
| is_complete | isComplete | 健康基础信息是否已完整 |
| height_cm_completed | heightCmCompleted | 身高是否已填写 |
| missing_fields | missingFields | 缺失字段列表 |

采集面板只渲染 `missing_fields` 中返回的指标。当前后端只返回 `height_cm` 时，面板只展示身高滚轮。

## 当前采集字段

| 字段 | 前端字段 | 说明 |
| ---- | -------- | ---- |
| 身高 | heightCm | 单位 cm，当前范围 `120.00-220.00`，步进 `0.25`，保存为小数点后两位 |
| 年龄 | age | 整数，当前范围 `18-99`，仅当后端返回年龄缺失字段时展示 |

## 当前保存方式

采集结果提交到后端：

```http
POST /user/profile
```

请求体按本次实际渲染并提交的字段生成。

示例：

```json
{
  "height_cm": 170.00
}
```

提交成功后写入内存状态，并尽量写入本地存储：

```text
flame_sport_pheno_user_health_profile
```

后续重新登录时，是否继续弹出采集面板以后端 `/auth/profile_complete_check` 返回为准。

保存示例：

```json
{
  "heightCm": 170.00,
  "age": 30,
  "collectedAt": "2026-07-20T14:30:00.000Z"
}
```

## 页面交互

- `missing_fields` 包含 `height_cm` 时，身高使用滚轮选择，展示为 `cm`。
- `missing_fields` 包含 `age` 或 `age_years` 时，年龄使用滚轮选择，范围为 `18-99`。
- 保存按钮先进入“确认保存”，再次点击后提交。
- 提交时按钮展示“保存中”和加载动画，失败时短暂展示“保存失败”。
- 提交成功后从屏幕外底部两侧 `0-40%` 屏幕高度范围喷入撒花动画，并立即关闭弹窗进入项目首页，撒花继续播放至动画结束。
- 弹窗展示时锁定页面滚动。
