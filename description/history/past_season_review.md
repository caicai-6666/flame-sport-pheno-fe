# 过往赛季上传记录

## 相关文件

```text
src/views/PastSeasonReviewView.vue
src/components/PastSeasonReviewPage.vue
src/api/history.js
src/state/appState.js
```

## 接口

```http
GET /proof/history
```

请求参数：无。

服务端会自行排除当前激活赛季的上传记录：优先读取运行时的当前赛季缓存，缓存尚未初始化时会先加载当前激活赛季。前端不传 `season_id`，只需携带 `Authorization: <auth_code>`。

推荐响应：

```json
[
  {
    "seasonName": "2026年6月赛季",
    "projectName": "健身",
    "reviewStatus": "approved",
    "reviewComment": "审核通过：健身上传图片清晰，训练记录符合本项目打卡要求。",
    "imageName": "健身1.jpg",
    "proofDate": "2026-06-01",
    "createdAt": "2026-06-01T09:00:00"
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
| reviewStatus | result | 审核状态，取值见下方枚举 |
| reviewComment | note | 审核意见；前端展示为记录说明 |
| imageName | fileName | 凭证文件名，仅包含上传文件主名和 `.jpg` 后缀 |
| proofDate | proofDate | 实际运动日期，格式 `YYYY-MM-DD` |
| createdAt | uploadedAt | 上传时间 |

`reviewStatus` 展示：

```text
pending                = 待初审
preliminary_approved   = 初审通过
preliminary_rejected   = 初审失败
approved               = 终审通过
rejected               = 终审失败
```

`proofDate` 表示实际运动日期；`createdAt` 表示上传时间，不表示审核时间，页面展示为 `YYYY.MM.DD HH:mm`。

## 页面展示

前端会按 `proofDate`（缺失时回退 `uploadedAt`）降序展示过往赛季上传记录。

`HistoryPage` 在用户未参与本赛季时，会直接复用 `PastSeasonReviewPage` 展示过往赛季上传记录，并隐藏“返回本赛季”按钮。
