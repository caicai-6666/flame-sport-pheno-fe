# 当前赛季上传历史

## 相关文件

```text
src/views/HistoryView.vue
src/components/HistoryPage.vue
src/api/history.js
src/state/appState.js
```

## 页面进入流程

进入 `HistoryPage` 时，前端会先确保当前赛季和赛季参与状态存在。

流程：

1. 获取当前赛季
2. 检查当前赛季参与状态
3. 如果用户已参与本赛季，查询本赛季上传记录
4. 如果用户未参与本赛季，仅展示过往赛季上传记录

未参与状态包括：

```text
registering
closed
unknown
```

其中 `unknown` 表示参与状态尚未确认或检查失败，此时不会展示本赛季上传历史，避免旧记录或 mock 数据残留。

## 接口

```http
GET /proof/current
```

请求参数：无。

推荐响应：

```json
[
  {
    "seasonName": "2026年7月赛季",
    "projectName": "健身",
    "reviewStatus": "pending",
    "note": "力量训练 45 分钟，包含深蹲、卧推和拉伸。",
    "imageName": "健身.jpg",
    "createdAt": "2026-07-19T15:30:00"
  }
]
```

兼容包装：

```json
{
  "records": []
}
```

## 字段映射

| 后端字段 | 前端字段 | 说明 |
| -------- | -------- | ---- |
| seasonName | seasonName | 赛季名称 |
| projectName | taskName | 项目名称 |
| reviewStatus | reviewStatus | 审核状态 |
| note | note | 用户备注 |
| imageName | fileName | 上传图片名称 |
| createdAt | uploadedAt | 上传时间 |

`reviewStatus` 展示：

```text
pending  = 审核中
approved = 已通过
rejected = 未通过
```

`createdAt` 表示上传时间。

## 页面展示

已参与本赛季时：

- 展示本赛季上传历史
- 展示赛季进度条
- 过往赛季上传记录通过按钮进入独立页面

未参与本赛季时：

- 不展示本赛季上传历史
- 不展示赛季进度条
- 不展示本赛季上传历史空状态
- 直接展示过往赛季上传记录

## 赛季进度

当前 `goal-progress-panel` 暂用前端 mock 百分比。

后续后端返回进度值后，前端只负责渲染：

```json
{
  "project_id": "1",
  "project_name": "日常步数",
  "progress": 68
}
```
