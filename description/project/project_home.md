# ProjectHome 项目首页

## 组件位置

```text
src/views/ProjectHomeView.vue
src/components/ProjectHome.vue
src/api/projects.js
src/api/season.js
src/state/appState.js
```

## 当前 real data 范围

ProjectHome 当前已接入真实接口：

- `GET /season/current`
- `GET /season/participate_check`
- `GET /project/list`
- `GET /project/lock_check`
- `GET /project/rules`
- `POST /project/lock_level`

上传凭证弹窗由 `project/upload_proof.md` 单独描述。

## 页面加载流程

`ProjectHomeView.created()` 调用 `loadHomeData()`：

```text
1. 并行请求项目列表和当前赛季
2. 检查赛季参与状态
3. 查询当前赛季已锁定项目
4. 如果满足条件，加载挑战等级选项
```

## 获取项目列表

```http
GET /project/list
```

推荐响应：

```json
[
  {
    "project_id": "running",
    "name": "跑步/快走",
    "description": "记录有氧强度，持续拉高身体活力曲线。",
    "image": "base64图片字符串",
    "image_content_type": "image/png"
  }
]
```

兼容包装：

```json
{
  "projects": []
}
```

前端处理：

- `project_id` 归一化为 `projectId`
- `image` 支持 data URL 或纯 base64
- 纯 base64 会按 `image_content_type` 拼成图片 src
- 项目数据写入 `appState.projectTasks`

## 获取已锁定项目

```http
GET /project/lock_check?season_id=2026-07
```

推荐响应：

```json
[
  "running",
  "daily_steps"
]
```

兼容格式：

```json
{
  "locked_projects": [
    {
      "project_id": "running",
      "name": "跑步/快走"
    }
  ]
}
```

前端处理：

- 写入 `appState.lockedProjectIds`
- 映射出 `appState.lockedTaskNames`
- 控制项目卡片已锁定状态
- 控制剩余可锁定数量

## 首页交互规则

未完成报名时：

- 点击未锁定项目进入项目详情页
- 已锁定项目展示“已锁定”
- 达到 `required_project_count` 后未锁定项目禁用

完成报名后：

- 已锁定项目点击后打开 `UploadProofPanel`
- 未锁定项目保持禁用

项目详情路由会携带：

```text
projectId
seasonId
```
