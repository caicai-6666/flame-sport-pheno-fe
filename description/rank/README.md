# Rank 页面

## 当前状态

`RankPage` 已接入 real data。

已接入：

- 当前赛季排行榜查询
- 按 `checkin_count` 降序计算排名
- 根据 `is_current_user` 定位当前用户排名
- 当前用户不在前 15 名时，展示前 15 名、省略行和当前用户所在行
- 返回列表不足 15 人时，仅展示实际返回记录，不补 mock 数据
- `rank-hero` 展示“以本赛季通过初审的凭证为准”
- `RankPage` 已接入路由 `KeepAlive`
- 加载中展示旋转加载动画和列表骨架动效
- 排行榜请求加载态最短保留 1 秒，避免接口过快返回时 UI 闪变
- 加载完成后排名概览和排行列表渐入展示

## 相关文档

```text
description/rank/leaderboard.md
```
