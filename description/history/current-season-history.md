# 当前赛季上传历史

本文说明当前赛季上传记录和项目进度的加载条件、接口契约及页面展示方式。

## 相关文件

```text
src/views/HistoryView.vue
src/components/HistoryPage.vue
src/api/history.js
src/api/projects.js
src/state/appState.js
```

---

## 页面进入流程

进入 `HistoryPage` 时，前端会先确保当前赛季和赛季参与状态存在。

流程：

1. 获取当前赛季
2. 检查当前赛季参与状态
3. 如果用户已参与本赛季，并行查询本赛季上传记录、项目列表和项目进度
4. 无论是否参与本赛季，都查询结算中赛季仍开放的可补传记录
5. 如果用户未参与本赛季，仅展示可补传入口和过往赛季上传记录

未参与状态包括：

```text
registering
closed
unknown
```

其中 `unknown` 表示参与状态尚未确认或检查失败，此时不会展示本赛季上传历史，避免旧记录或模拟数据残留。

---

## `GET /proof/current` 获取当前赛季记录

### 接口定义

```http
GET /proof/current
```

### 请求参数

无。

### 成功响应

推荐响应如下：

```json
[
  {
    "seasonName": "2026年7月赛季",
    "projectName": "健身",
    "reviewStatus": "pending",
    "reviewComment": "",
    "preliminaryReviewComment": "",
    "finalReviewComment": "",
    "note": "力量训练 45 分钟，包含深蹲、卧推和拉伸。",
    "imageName": "健身.webp",
    "imageUrl": "/flame/api/image/proof_record/18",
    "proofDate": "2026-07-19",
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

### 字段映射

| 后端字段        | 前端字段        | 说明                                                                                            |
| --------------- | --------------- | ----------------------------------------------------------------------------------------------- |
| `seasonName`    | `seasonName`    | 赛季名称，对应 `season.name`                                                                    |
| `projectName`   | `taskName`      | 项目名称，对应 `project.name`                                                                   |
| `reviewStatus`  | `reviewStatus`  | 审核状态，取值见下方枚举                                                                        |
| `reviewComment` | `reviewComment` | 当前审核阶段意见的兼容字段；前端仅用于兼容尚未升级的后端                                      |
| `preliminaryReviewComment` | `preliminaryReviewComment` | 大模型初审意见；非空时独立展示为“初审意见”                                      |
| `finalReviewComment` | `finalReviewComment` | 管理员终审意见；非空时独立展示为“终审意见”                                            |
| `note`          | `note`          | 用户上传备注，对应 `proof_record.note`；未填写时为空字符串                                      |
| `imageName`     | `fileName`      | 凭证文件名，新上传记录为 `{上传文件主名}.webp`；历史 JPG 记录可继续返回原后缀，不含系统生成前缀 |
| `imageUrl`      | `imageUrl`      | 受鉴权保护的凭证原图读取地址；点击记录后以 Blob 发起 GET 请求并在弹层展示                       |
| `proofDate`     | `proofDate`     | 实际运动日期，对应 `proof_record.proof_date`，格式 `YYYY-MM-DD`；用于历史排序和同日重传识别     |
| `createdAt`     | `uploadedAt`    | 上传时间，对应 `proof_record.created_at`                                                        |

`reviewStatus` 展示：

```text
pending                = 待初审
preliminary_approved   = 初审通过
preliminary_rejected   = 初审失败
approved               = 终审通过
rejected               = 终审失败
```

未知状态会降级展示为“待初审”，避免接口枚举扩展时出现空标签。

`proofDate` 表示实际运动日期，卡片日期与列表排序优先使用该字段；`createdAt` 表示实际上传时间，卡片右上角明确展示为 `YYYY.MM.DD HH:mm`。

### 异常处理

仅在用户已经参与当前赛季时请求该接口。请求失败时不回退模拟记录，页面展示现有加载失败状态。

---

## 页面展示

已参与本赛季时：

- 展示本赛季上传历史
- 初审或终审意见非空时，在用户上传备注下方分别以“初审意见”和“终审意见”展示；两者同时存在时按初审、终审顺序展示
- 含 `imageUrl` 的记录整卡可点击（键盘 Enter / Space 同样可用）；点击后会从该地址提取 `/image/proof_record/{id}` 相对接口，再由当前环境的 API 前缀请求原图并在弹层展示。图片请求复用全局 `Authorization`、超时重试与 401 重登，关闭弹层会释放 Blob 对象 URL。
- 原图弹层使用与上传面板一致的遮罩淡入、内容框从右侧滑入/滑出过渡。图片解码完成后，展示区域会按原图宽高比从加载占位高度平滑伸缩；长图扩展到弹层可视上限后改为区域内滚动。系统开启“减少动态效果”时不播放上述过渡。
- 记录列表在卡片四周保留阴影绘制空间，卡片使用短距离双层阴影，避免滚动容器裁掉横向阴影后形成底部长条。可查看原图的记录卡仅在支持悬停的鼠标设备上轻微浮起；触摸设备不会残留 `:hover` 大阴影，按下时仍会短暂下沉。
- 刚上传成功而后端尚未返回 `imageUrl` 的即时记录，会在当前会话内复用提交时保留的 WebP Blob 直接展示原图；刷新页面或重新拉取当前赛季记录后，该临时 Blob 自动丢弃并改用后端地址。
- 展示赛季进度条。进度卡与可补传记录概况共用同一个 `supplement` 液体背景；进度文字、轨道和百分比使用适配深色背景的高对比配色。
- 过往赛季上传记录通过记录看板按钮切换展示。记录看板继续翻转，赛季进度卡本身保持原位，仅将内部内容切换为可补传记录数量；可补传记录直接置于全部归档最前方。
- 切换到过往记录时，顶部眉题、标题和进度卡内容从右侧划入；返回本赛季时从左侧划入，卡片与液体背景保持连续。系统开启“减少动态效果”时直接切换内容，不播放横向位移。

未参与本赛季时：

- 不展示本赛季上传历史
- 不展示当前赛季进度条，直接展示只读的可补传记录概况卡
- 不展示本赛季上传历史空状态
- 直接展示过往赛季上传记录

当 `GET /season/current` 返回无激活赛季 `404` 时，同样只展示过往赛季记录，并在说明中提示“当前暂无进行中的赛季，敬请期待”。不会请求当前赛季上传记录或项目进度。

---

## `GET /project/progress` 获取赛季进度

### 接口定义

```http
GET /project/progress?season_id=2026-07
```

### 请求参数

| 参数名      | 类型              | 是否必填 | 说明        |
| ----------- | ----------------- | -------: | ----------- |
| `season_id` | `string / number` |       是 | 当前赛季 ID |

### 成功响应

推荐响应如下：

```json
[
  {
    "project_id": 1,
    "completion_progress": 0.35
  }
]
```

字段映射：

| 后端字段              | 前端字段             | 说明                                          |
| --------------------- | -------------------- | --------------------------------------------- |
| `project_id`          | `projectId`          | 项目 ID，用于关联项目列表中的项目名称和配色   |
| `completion_progress` | `completionProgress` | 0 ～ 1 的完成比例，页面展示时转换为 0 ～ 100% |

### 异常处理

前端仅在用户已参与当前赛季时请求该接口。接口失败时不回退模拟数据，赛季进度区域展示加载失败提示。

首次进入历史页并获取到真实进度后，所有进度条及其百分比会在约 780 ms 内从 0 同步推进到接口返回的目标值。页面由路由 `KeepAlive` 缓存，之后切回历史页不会重复播放；系统开启“减少动态效果”时直接展示目标值。
