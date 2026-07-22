# 积分流水

## 相关文件

```text
src/views/ShopView.vue
src/components/ShopPage.vue
src/api/shop.js
```

## 接口

```http
GET /shop/point_flow
```

请求参数：无。

推荐响应：

```json
[
  {
    "product_name": "Keep 弹力带-入门款",
    "change_type": "exchange",
    "change_points": -30,
    "points_after": 70,
    "description": "兑换商品",
    "created_at": "2026-07-20T12:30:00"
  },
  {
    "product_name": "",
    "change_type": "season_reward",
    "change_points": 100,
    "points_after": 100,
    "description": "2026年6月赛季达标奖励",
    "created_at": "2026-07-19T18:00:00"
  }
]
```

## 字段映射

| 后端字段 | 前端字段 | 说明 |
| -------- | -------- | ---- |
| product_name | productName | 商品名称，商品兑换时使用 |
| change_type | changeType | 流水类型 |
| change_points | amount | 本次积分变动值 |
| points_after | balanceAfter | 本次变动后的积分余额 |
| description | description | 流水描述 |
| created_at | occurredAt | 变动时间 |

## 页面展示

- 前端严格按 `created_at` 降序展示积分流水。
- `change_type = season_reward` 时，条目标题使用 `description`。
- `change_type = exchange` 时，条目标题优先展示为 `兑换{product_name}`。
- 可用积分取降序排序后第一条记录的 `points_after`，即最新一次积分变动后的余额。
- 没有积分流水时，可用积分展示为 `0`。
