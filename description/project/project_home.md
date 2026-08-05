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

上传记录弹窗由 `project/upload_proof.md` 单独描述。

## 页面加载流程

`ProjectHomeView.created()` 调用 `loadHomeData()`：

```text
1. 并行请求项目列表和当前赛季
2. 检查赛季参与状态
3. 查询当前赛季已锁定项目
4. 如果满足条件，加载挑战等级选项
5. 已确认挑战等级时，为每个项目加载该等级对应的规则要求并展示到项目卡片
```

## 项目卡片等级要求

当用户已经确认赛季挑战等级后，`ProjectHome` 的项目卡片不再只展示项目基础描述，而是优先展示该项目在当前挑战等级下的要求。

数据来源：

```http
GET /project/rules?project_id=running
```

前端匹配逻辑：

- 使用 `selectedChallengeLevel` 匹配规则中的 `level`、`name` 或 `{level}挑战`
- 优先使用 `rule_content` / `metrics` 生成要求文案
- 如果没有可展示指标，则退回使用 `rule_note` / `note` / `subtitle`
- 单个项目规则请求失败时，该项目卡片保留原始 `description`，不影响首页其他项目展示

示例响应：

```json
{
  "levels": [
    {
      "project_rule_level_id": 101,
      "name": "青铜挑战",
      "rule_content": [
        {
          "label": "完成次数",
          "value": "5 次"
        },
        {
          "label": "单次距离",
          "value": "3 公里"
        }
      ],
      "rule_note": "仅统计审核通过的记录"
    }
  ]
}
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
    "image": "/跑步.png"
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
- `image` 为项目图标在后端图标目录中的相对路径，例如 `/跑步.png`
- 前端使用携带 `Authorization` 的 `GET /image/project_icon?filename=/跑步.png` 获取图标 Blob，再转换为对象 URL 供项目卡片显示；不能直接在 `<img>` 中请求该接口，否则无法附加鉴权请求头
- 对象 URL 在当前应用会话内按图标路径复用，首页、历史页不会重复请求同一图标；单个图标加载失败不会阻断项目列表或报名流程
- 当前项目图标均为含 Alpha 通道的 RGBA PNG；项目卡片不再为图标容器绘制白色或彩色底板，透明区域直接透出卡片背景，并仅按图标 Alpha 轮廓添加轻微投影
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

## 意见收集卡片

项目网格会在全部后端项目卡片之后固定展示一张“意见收集”卡片：

- 图标使用带 Alpha 通道的本地 `src/assets/xinxiang.png`，不请求后端；容器保持透明，不额外绘制粉色底板。该 PNG 体积较小，当前会内联进带内容哈希的 JavaScript 构建产物，并随脚本使用长期缓存；
- 该卡片不属于运动项目，不参与赛季报名、锁定数量、项目规则或上传凭证流程；
- 当前仅展示“敬请期待”，尚未接入意见提交入口。

## 首页交互规则

### 无激活赛季

`GET /season/current` 返回无激活赛季 `404` 时：

- hero 展示“新赛季敬请期待”，说明赛季开启后才能报名、锁定等级与上传记录；
- 保留项目卡片，用户仍可进入详情浏览项目介绍和挑战规则；
- 不查询报名状态、已锁定项目或挑战等级，也不显示报名进度；
- 项目卡片动作统一为“查看挑战”，不允许进入上传流程。

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
