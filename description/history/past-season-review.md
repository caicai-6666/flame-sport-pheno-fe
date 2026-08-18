# 过往赛季上传记录

本文说明过往赛季凭证记录的查询契约、字段映射和受鉴权原图查看方式。

## 相关文件

```text
src/views/PastSeasonReviewView.vue
src/components/PastSeasonReviewPage.vue
src/components/SupplementRecordCard.vue
src/api/history.js
src/state/appState.js
src/utils/proofImageProcessing.js
```

---

## `GET /proof/history` 获取过往赛季记录

### 接口定义

```http
GET /proof/history
```

### 请求参数

无。前端只需携带 `Authorization: <auth_code>`。

服务端会自行排除当前激活赛季的上传记录：优先读取运行时的当前赛季缓存，缓存尚未初始化时会先加载当前激活赛季。前端不传 `season_id`，只需携带 `Authorization: <auth_code>`。

### 成功响应

推荐响应如下：

```json
[
  {
    "seasonName": "2026年6月赛季",
    "projectName": "健身",
    "reviewStatus": "approved",
    "reviewComment": "审核通过：健身上传图片清晰，训练记录符合本项目打卡要求。",
    "imageName": "健身1.jpg",
    "imageUrl": "/flame/api/image/proof_record/18",
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

### 字段映射

| 后端字段        | 前端字段     | 说明                                                                         |
| --------------- | ------------ | ---------------------------------------------------------------------------- |
| `seasonName`    | `seasonName` | 赛季名称                                                                     |
| `projectName`   | `taskName`   | 项目名称                                                                     |
| `reviewStatus`  | `result`     | 审核状态，取值见下方枚举                                                     |
| `reviewComment` | `note`       | 审核意见；前端展示为记录说明                                                 |
| `imageName`     | `fileName`   | 凭证文件名，保留实际存储后缀；新记录为 `.webp`，历史 `.jpg` 记录仍可正常返回 |
| `imageUrl`      | `imageUrl`   | 受鉴权保护的凭证原图读取地址；前端点击该条记录后以 Blob 发起 GET 请求        |
| `proofDate`     | `proofDate`  | 实际运动日期，格式 `YYYY-MM-DD`                                              |
| `createdAt`     | `uploadedAt` | 上传时间                                                                     |

`reviewStatus` 展示：

```text
pending                = 待初审
preliminary_approved   = 初审通过
preliminary_rejected   = 初审失败
approved               = 终审通过
rejected               = 终审失败
```

`proofDate` 表示实际运动日期；`createdAt` 表示上传时间，不表示审核时间，页面展示为 `YYYY.MM.DD HH:mm`。

### 异常处理

请求失败时页面保留错误恢复入口，不使用模拟记录；空数组表示没有可展示的过往记录。

---

## `GET /supplement/records` 获取可补传记录

### 接口定义

```http
GET /supplement/records
```

### 请求参数

无。前端携带当前登录态，后端仅返回当前用户在结算中赛季仍具备有效补传资格的凭证。

### 成功响应

推荐响应如下：

```json
[
  {
    "seasonId": 6,
    "seasonUserId": 79,
    "proofRecordId": 295,
    "seasonName": "2026年7月赛季",
    "projectName": "跑步",
    "reviewStatus": "rejected",
    "reviewComment": "凭证信息未达到终审要求。",
    "note": "完成跑步5公里",
    "imageName": "跑步.webp",
    "imageUrl": "/flame/api/image/proof_record/295",
    "proofDate": "2026-07-18",
    "createdAt": "2026-07-18T08:30:00"
  }
]
```

兼容对象包装：

```json
{
  "records": []
}
```

### 字段映射

可补传记录复用过往记录的展示模型，并保留以下资格定位字段：

| 后端字段        | 前端字段        | 说明                               |
| --------------- | --------------- | ---------------------------------- |
| `seasonId`      | `seasonId`      | 结算中赛季 ID                      |
| `seasonUserId`  | `seasonUserId`  | 当前用户对应的赛季参与记录 ID      |
| `proofRecordId` | `proofRecordId` | 获得补传资格的原凭证记录 ID        |
| `seasonName`    | `seasonName`    | 赛季名称                           |
| `projectName`   | `taskName`      | 项目名称                           |
| `reviewStatus`  | `result`        | 原凭证审核状态                     |
| `reviewComment` | `reviewComment` | 原凭证审核意见，独立于用户备注展示 |
| `note`          | `note`          | 用户原凭证备注                     |
| `imageName`     | `fileName`      | 原凭证文件名                       |
| `imageUrl`      | `imageUrl`      | 受鉴权保护的原凭证图片地址         |
| `proofDate`     | `proofDate`     | 实际运动日期，格式 `YYYY-MM-DD`    |
| `createdAt`     | `uploadedAt`    | 原凭证上传时间                     |

### 异常处理

空数组表示当前没有可补传记录，概况卡显示“当前无可补传记录”。请求失败时概况卡单独显示加载失败，不影响全部过往记录的查询和查看。概况卡只展示数量和加载状态，不提供点击、筛选或跳转操作。

前端保持接口返回的以下排序，不再对补传数组按单一日期重新排序：

```text
season.start_date DESC
proof_record.proof_date DESC
proof_record.created_at DESC
proof_record.id DESC
```

查询接口本身不会修改资格。用户补交凭证时，由 `POST /supplement/upload` 完成资格校验、原记录覆盖和资格消费。

---

## `POST /supplement/upload` 补交凭证

### 接口定义

```http
POST /supplement/upload
Content-Type: multipart/form-data
```

### 请求参数

卡片只允许用户更换图片和填写备注。赛季、项目、运动日期以及上传配置由资格记录和项目配置自动带入，不向用户开放修改。

| 字段名                     | 类型              | 是否必填 | 页面来源                                                    |
| -------------------------- | ----------------- | -------: | ----------------------------------------------------------- |
| `proof_record_id`          | `string / number` |       是 | `GET /supplement/records` 返回的原凭证 ID                   |
| `season_id`                | `string / number` |       是 | `GET /supplement/records` 返回的结算中赛季 ID               |
| `project_id`               | `string / number` |       是 | 优先使用补传记录字段，缺失时按 `projectName` 匹配项目列表   |
| `project_upload_config_id` | `string / number` |       是 | 该项目当前首个启用的上传配置                                |
| `record_type`              | `string`          |       否 | 随选定上传配置自动提交，用于兼容后端一致性校验              |
| `proof_date`               | `string`          |       是 | 原凭证运动日期，格式为 `YYYY-MM-DD`，页面只读              |
| `note`                     | `string`          |       是 | 用户本次补传备注                                            |
| `image`                    | `File`            |       是 | 前端压缩或拼接后的单个 WebP 文件                            |

> **注意**
>
> 查询响应当前未固定提供 `projectId`。前端会兼容该字段，并在缺失时使用项目名称匹配 `GET /project/list` 的结果。项目列表无法定位对应项目时，卡片会禁用补传入口，不构造缺少项目 ID 的请求。

### 图片处理

补传与普通凭证上传共用 `src/utils/proofImageProcessing.js`：

- 每次选择 1 ～ 5 张图片，仅接受 `image/*` 文件。
- 单图压缩为 WebP；多图按选择顺序纵向等比拼接为一张 WebP 长图。
- 处理结果小于等于 5 MB，并可在提交前打开凭证预览弹层查看完整结果。
- 最终接口始终只提交一个 `image` 文件。

### 成功响应

```json
{
  "created_at": "2026-08-18T16:20:00",
  "proof_date": "2026-07-18"
}
```

成功后，后端原位更新原凭证，将审核状态恢复为 `pending`，清空旧审核意见并消费补传资格。前端同时刷新过往记录与可补传记录；被消费的卡片从可补传列表移除，更新后的凭证继续出现在归档记录中。

### 异常处理

| 状态码 | 场景                               | 页面处理                                               |
| ------: | ---------------------------------- | ------------------------------------------------------ |
|   `400` | 上传配置、备注、日期或图片不合法   | 保留卡片背面的图片和备注，显示后端错误并允许重试       |
|   `401` | 登录失效                           | 交由请求层重新登录；重试仍失败时显示登录错误           |
|   `409` | 资格已消费或请求与原凭证不一致     | 保留当前输入并显示后端错误，用户可返回记录后刷新页面   |
|   `409` | 当前处于新赛季开始后的写入保护期   | 前端提前禁用补传，后端仍执行最终强校验                 |

同一资格发生并发提交时，只有首个成功请求可以消费资格。补传写请求不会自动重试，避免重复提交图片。

---

## 页面展示

前端会先展示 `/supplement/records` 返回的全部可补传记录，再展示普通过往记录。可补传部分保持接口排序；普通过往记录按 `proofDate`（缺失时回退 `uploadedAt`）降序排列。

两组数据使用 `proofRecordId` 去重；历史接口未直接返回该字段时，API 适配层会从 `imageUrl` 的 `/proof_record/{id}` 路径中提取。重复凭证优先采用补传接口记录，以保留资格 ID、用户备注和审核意见。置顶记录使用与可补传入口一致的紫色、珊瑚色和浅金色渐变，并将 `note` 与 `reviewComment` 分区展示。

可补传记录卡顶部展示“补传”按钮。点击后卡片以 3D 方式翻到背面，并根据表单高度平滑伸长；背面保留只读的赛季、项目和运动日期，只提供图片选择、拼接结果预览与备注输入。提交采用短时二次确认：第一次点击后，按钮文字以纵向滑动过渡切换为“再次点击确认补传”，同时变为橙色并播放轻微呼吸动画；有效期内再次点击才发起请求。系统开启“减少动态效果”时保留状态颜色变化，但不播放文字位移和呼吸动画。

有 `imageUrl` 的记录整卡可按压查看原图。前端会从返回地址提取 `GET /image/proof_record/{proof_record_id}` 相对接口，不能直接使用 `<img src>`；而是通过带 `Authorization` 的 Blob 请求获取并在弹层展示，关闭弹层后释放对象 URL。

原图弹层采用与上传面板一致的遮罩淡入、内容框从右侧滑入与滑出过渡。图片解码完成后，展示区域会按原图宽高比从加载占位高度平滑伸缩；长图扩展到弹层可视上限后改为区域内滚动。系统开启“减少动态效果”时不播放上述过渡。

当前历史看板与独立过往记录页都在卡片四周保留阴影绘制空间，并使用短距离双层阴影，避免滚动层裁切出底部长条。可查看原图的记录卡只在支持悬停的鼠标设备上轻微抬起；触摸设备不会保留 `:hover` 阴影，按下时仍会短暂下沉。可补传记录的正反面沿用同一阴影尺度。

`HistoryPage` 在用户未参与本赛季时，会直接复用 `PastSeasonReviewPage`，在顶部液体卡片下方直接展示可补传记录概况卡，并隐藏“返回本赛季”按钮。概况卡只显示真实资格数量，不提供点击逻辑、操作文案或方向箭头。记录列表始终展示全部归档，并将可补传记录置顶，用户可在具体记录卡内完成补传。

用户已参与本赛季时，过往记录在当前历史页的记录看板内切换展示；赛季进度卡同步翻到只读的可补传记录概况卡。该卡片使用独立的深紫、珊瑚金与青绿色 PixiJS 液体背景，并在不支持 WebGL 或开启“减少动态效果”时保留同色系静态渐变。顶部眉题和标题会从右侧外部划入，返回本赛季时则从左侧外部划入。
