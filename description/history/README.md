# History 文档占位

当前 `HistoryPage` 尚未完成 real data 查询迁移。

当前状态：

- 本赛季上传记录来自 `appState.uploadRecords`
- `UploadProofPanel` 上传成功后会即时向该数组追加记录
- 过往赛季审核记录来自 `appState.pastSeasonReviewRecords`

后续接入真实接口时，建议新增：

```text
description/history/current_season_history.md
description/history/past_season_review.md
```
