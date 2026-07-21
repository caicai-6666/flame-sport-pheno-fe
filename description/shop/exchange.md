# 商品兑换

## 相关文件

```text
src/views/ShopView.vue
src/components/ShopPage.vue
src/api/shop.js
```

## 接口

```http
POST /shop/consume
```

请求参数：

| 参数 | 说明 |
| ---- | ---- |
| product_id | 奖品 ID |

推荐响应：

```json
{
  "points_after": 70,
  "created_at": "2026-07-20T13:00:00"
}
```

## 字段映射

| 后端字段 | 前端字段 | 说明 |
| -------- | -------- | ---- |
| points_after | pointsAfter | 兑换后的积分余额 |
| created_at | createdAt | 兑换发生时间 |

## 页面更新

- 用户点击“兑换”后先进入“确认兑换”，再次点击才提交兑换。
- 提交后按钮进入“兑换中”状态，并显示加载动画。
- 前端会在进入“兑换中”后延迟 1 秒再调用接口，让中间态动画有可感知的停留。
- 调用 `POST /shop/consume` 时，请求体传入 `product_id`。
- “兑换中”会保留最短展示时长，避免接口过快返回导致状态切换突兀。
- 兑换成功后使用 `points_after` 更新可用积分。
- 兑换成功后用 `created_at` 生成一条本地即时兑换流水，并与已有积分流水按时间倒序展示。
- 兑换失败时不扣减积分，按钮短暂展示“兑换失败”。
