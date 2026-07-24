# 当前赛季上传历史

## 相关文件

```text
src/views/HistoryView.vue
src/components/HistoryPage.vue
src/api/history.js
src/api/projects.js
src/state/appState.js
```

## 页面进入流程

进入 `HistoryPage` 时，前端会先确保当前赛季和赛季参与状态存在。

流程：

1. 获取当前赛季
2. 检查当前赛季参与状态
3. 如果用户已参与本赛季，并行查询本赛季上传记录、项目列表和项目进度
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
    "reviewComment": "初审已通过，等待终审。",
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
| reviewComment | reviewComment | 审核人员意见；非空时单独展示，不能覆盖用户备注 |
| note | note | 用户备注 |
| imageName | fileName | 上传图片名称 |
| createdAt | uploadedAt | 上传时间 |

`reviewStatus` 展示：

```text
pending                = 待初审
preliminary_approved   = 初审通过
preliminary_rejected   = 初审失败
approved               = 终审通过
rejected               = 终审失败
```

未知状态会降级展示为“待初审”，避免接口枚举扩展时出现空标签。

`createdAt` 表示上传时间。

## 页面展示

已参与本赛季时：

- 展示本赛季上传历史
- `reviewComment` 非空时，在用户上传备注下方以“审核意见”单独展示
- 展示赛季进度条
- 过往赛季上传记录通过按钮进入独立页面

未参与本赛季时：

- 不展示本赛季上传历史
- 不展示赛季进度条
- 不展示本赛季上传历史空状态
- 直接展示过往赛季上传记录

当 `GET /season/current` 返回无激活赛季 `404` 时，同样只展示过往赛季记录，并在说明中提示“当前暂无进行中的赛季，敬请期待”。不会请求当前赛季上传记录或项目进度。

## 赛季进度

```http
GET /project/progress?season_id=2026-07
```

推荐响应：

```json
[
  {
    "project_id": 1,
    "completion_progress": 0.35
  }
]
```

字段映射：

| 后端字段 | 前端字段 | 说明 |
| -------- | -------- | ---- |
| project_id | projectId | 项目 ID，用于关联项目列表中的项目名称和配色 |
| completion_progress | completionProgress | 0～1 的完成比例，页面展示时转换为 0～100% |

前端仅在用户已参与当前赛季时请求该接口。接口失败时不回退 mock 数据，赛季进度区域展示加载失败提示。

首次进入历史页并获取到真实进度后，所有进度条及其百分比会在约 780ms 内从 0 同步推进到接口返回的目标值。页面由路由 `KeepAlive` 缓存，之后切回历史页不会重复播放；系统开启“减少动态效果”时直接展示目标值。
