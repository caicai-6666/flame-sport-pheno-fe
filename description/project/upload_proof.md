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

无激活赛季时，首页不会打开上传弹窗；即使通过旧页面缓存或异常入口绕过前端，后端也必须拒绝没有有效当前赛季的 `POST /proof/upload`。

上传成功后，前端会即时追加一条记录到 `appState.uploadRecords`，因此当前会话中进入 `HistoryPage` 能立即看到新上传内容。即时记录会仅在内存中保留本次提交的 JPG Blob；后端尚未返回 `imageUrl` 时可直接查看这张临时原图。
进入 `HistoryPage` 时，前端会重新查询当前赛季上传历史；即时追加只用于上传成功后的当前会话反馈。

用户完成图片处理后，可点击上传摘要中的“查看处理后的图片”翻转上传面板至背面，在独立的可滚动区域查看完整 JPG 长图；点击“返回编辑”翻回表单，上传字段和已选图片保持不变。

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
| proof_date | string | 是 | 凭证对应的实际运动日期，格式 `YYYY-MM-DD` |
| note | string | 是 | 用户备注 |
| image | File | 是 | 前端处理后的 JPG 图片 |

示例：

```text
season_id=2026-07
project_id=1
project_upload_config_id=10
proof_date=2026-07-19
note=今日累计 8600 步
image=steps-20260719.jpg
```

## 备注填写引导

上传面板使用单列玻璃质感日期滚轮，不提供月份切换：中央单行高亮展示当前选择，左侧三角标指向选中行，上下仅淡化露出相邻日期。滚轮仅列出本月中位于赛季起止范围内、且不晚于今天的日期，默认选择当天（今天不在有效范围时才回退到最后一个有效日）。因此不能上传未来日期或上月记录。前端限制之外，后端仍会再次校验日期范围，防止构造请求绕过限制。

项目名称为“减重挑战”时，不展示日期滚轮，`proof_date` 固定为当天；提交请求仍照常携带该必填字段。

同一项目同一运动日期只能保留一条有效记录。用户再次提交相同日期时，后端按重传处理并重新初审；前端即时历史也会替换该日期的旧记录。

备注为必填项。前端拒绝空白备注，输入框下方会提示用户填写时长、距离、次数、步数等可核验指标；描述越具体，越便于初审核验并有助于通过初审。

## 移动端弹窗布局与兼容

- 上传表单的图片、配置和备注区域可在弹窗内部滚动；提交按钮固定在弹窗底部、横向填满操作区并保留圆角内边距，避免小屏幕或钉钉内置浏览器可视高度变化时被内容挤出。
- 上传图片框线和主要颜色先使用基础 CSS 颜色作为回退，再叠加 `color-mix()` 的增强效果；不支持该函数的旧版 Android WebView 仍会显示绿色虚线边框和可辨识的上传区域。

成功响应：

```json
{
  "created_at": "2026-07-19T13:20:00+08:00",
  "proof_date": "2026-07-19"
}
```

## 图片处理

用户每次可选择 1～5 张图片：

- 钉钉/移动端拍照入口每次只能产生 1 张新照片；从相册或文件选择图片时最多可同时选择 5 张。
- 选择 1 张时，沿用单图处理流程。
- 选择 2～5 张时，前端按选择顺序纵向拼接为一张白底 JPG 长图；每张图片只做等比缩放，完整保留、不裁切、不拉伸。长图优先保留约 960px 以上的可读宽度，不会仅为压缩体积继续缩小到文字难以辨识；在此清晰度下仍超出 5 MB 时提示用户减少图片数量或选择更清晰的截图。
- 最终仍只向后端提交一个 `image` 文件，不增加接口字段或改变审核、历史记录逻辑。
- 超过 5 张或包含非图片文件时，前端会拒绝本次选择并提示用户重新选择。

无论单图或双图，前端都会：

1. 读取任意 `image/*` 图片
2. 绘制到 `canvas`
3. 透明区域先铺白底
4. 导出为 `image/jpeg`
5. 单图从长边 1920px 开始压缩；多图长图按宽度优先保留清晰度
6. 逐步降低 JPG quality，必要时仅缩小长图宽度
7. 确保最终文件小于 5MB

最终上传文件满足：

```text
Content-Type: image/jpeg
文件大小 <= 5MB
文件后缀 = .jpg
```

## 文件命名规则

前端不再向用户展示或开放图片重命名。提交文件名由前端内部生成：单图采用原文件主名，多图采用首图主名加“`-N张凭证`”，统一清理不适合文件名的字符并追加 `.jpg` 后缀。

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

后端返回 `created_at` 和 `proof_date`。上传成功后，前端使用本次提交时已有信息追加本地历史记录：

- `taskName`
- `projectId`
- `fileName`
- `recordType`
- `note`
- `reviewStatus = pending`
- `proofDate = proof_date`
- `uploadedAt = created_at`
- `temporaryImageBlob = 本次提交的 JPG Blob`，仅当前页面会话用于查看刚上传的原图，不持久化；刷新页面或历史接口重新拉取后自动丢弃，改用后端返回的 `imageUrl`

这里的 `recordType` 仅用于前端展示，后端写库依据是 `project_upload_config_id`；`proofDate` 用于在即时历史中替换同项目同日期的旧记录。
