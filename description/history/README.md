# History 页面

## 当前状态

`HistoryPage` 已开始接入 real data。

已接入：

- 当前赛季参与状态检查
- 当前赛季上传记录查询
- 当前与过往赛季记录支持按压查看受鉴权保护的凭证原图
- 可查看原图的记录采用抬起式按压反馈
- 当前赛季各项目完成进度查询
- 未参与本赛季时，仅展示过往赛季上传记录
- 过往赛季上传记录查询
- `HistoryPage` 及过往赛季上传记录页已接入路由 `KeepAlive`

赛季进度条使用后端返回的完成比例，不再使用前端 mock 百分比。

## 相关文档

```text
description/history/current_season_history.md
description/history/past_season_review.md
```
