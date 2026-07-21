# UploadProofPanel 记录上传

## 组件位置

```text
src/components/UploadProofPanel.vue
src/components/ProjectHome.vue
src/views/ProjectHomeView.vue
src/api/projects.js
```

## 当前 real data 范围

已接入：

- `GET /proof/config`
- `POST /proof/upload`

上传成功后，前端会即时追加一条记录到 `appState.uploadRecords`，因此当前会话中进入 `HistoryPage` 能立即看到新上传内容。
进入 `HistoryPage` 时，前端会重新查询当前赛季上传历史；即时追加只用于上传成功后的当前会话反馈。

## 获取项目上传配置

```http
GET /proof/config?project_id=1
```

推荐响应：

```json
[
  {
    "id": "10",
    "record_type": "普通记录",
    "upload_hint": "步数截图、手环记录或健康 App 截图",
    "note_example": "例如：今日累计 8600 步"
  }
]
```

兼容包装：

```json
{
  "uploadConfigs": []
}
```

前端处理：

- `id` 归一化为 `uploadConfigId`
- `record_type` 归一化为 `recordType`
- 只有一条配置时不展示记录类型切换器
- 多条配置时展示切换按钮
- 缺少 `id` 时不允许提交
- 上传配置按 `project_id` 缓存在前端，同一项目重复打开上传弹窗时不重复请求

## 上传记录

```http
POST /proof/upload
```

请求体使用 `FormData`：

| 字段名 | 类型 | 是否必填 | 说明 |
| ------ | ---- | -------: | ---- |
| season_id | string / number | 是 | 当前赛季 ID |
| project_id | string / number | 是 | 项目 ID |
| project_upload_config_id | string / number | 是 | 上传配置 ID |
| note | string | 否 | 用户备注 |
| image | File | 是 | 前端处理后的 JPG 图片 |

示例：

```text
season_id=2026-07
project_id=1
project_upload_config_id=10
note=今日累计 8600 步
image=steps-20260719.jpg
```

成功响应：

```json
{
  "created_at": "2026-07-19T13:20:00+08:00"
}
```

## 图片处理

用户选择图片后，前端会：

1. 读取任意 `image/*` 图片
2. 绘制到 `canvas`
3. 透明区域先铺白底
4. 导出为 `image/jpeg`
5. 从长边 1920px 开始压缩
6. 逐步降低 JPG quality
7. 确保最终文件小于 1MB

最终上传文件满足：

```text
Content-Type: image/jpeg
文件大小 <= 1MB
文件后缀 = .jpg
```

## 重命名规则

`upload-summary` 中展示可编辑文件名：

- 默认使用原文件主名
- 后缀固定为 `.jpg`
- 用户只能编辑主名
- 提交前清理不适合文件名的字符
- 空文件名不能提交

## 按钮状态

```text
提交记录 -> 确认提交 -> 上传中 -> 成功关闭面板
```

失败时：

```text
上传中 -> 上传失败 -> 恢复可重试
```

为了避免接口过快返回导致状态闪烁，前端保证“上传中”至少展示约 1.8 秒。该延迟只影响 UI 状态结束，不延迟真实网络请求发起。

## HistoryPage 即时追加

后端只返回 `created_at`。上传成功后，前端使用本次提交时已有信息追加本地历史记录：

- `taskName`
- `projectId`
- `fileName`
- `recordType`
- `note`
- `reviewStatus = pending`
- `uploadedAt = created_at`

这里的 `recordType` 仅用于前端展示，后端写库依据是 `project_upload_config_id`。
