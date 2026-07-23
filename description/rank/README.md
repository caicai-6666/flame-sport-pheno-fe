# Rank 页面

## 当前状态

`RankPage` 已接入 real data。

已接入：

- 当前赛季排行榜查询
- 按 `checkin_count` 降序计算排名
- 根据 `is_current_user` 定位当前用户排名
- 完整展示接口返回的所有用户，不裁剪为前 15 名，也不插入省略行
- `rank-hero` 展示“以本赛季通过初审的凭证为准”
- `RankPage` 已接入路由 `KeepAlive`
- 加载中展示旋转加载动画和列表骨架动效
- 排行榜请求加载态最短保留 1 秒，避免接口过快返回时 UI 闪变
- 加载完成后排名概览和排行列表渐入展示

## 相关文档

```text
description/rank/leaderboard.md
```
