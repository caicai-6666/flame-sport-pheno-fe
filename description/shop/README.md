# Shop 页面

## 当前状态

`ShopPage` 已开始接入 real data。

已接入：

- 奖品列表查询
- 奖品图片查询
- 按兑换积分分档展示奖品
- 积分流水查询
- 可用积分根据最新积分流水计算
- 商品兑换扣减
- 赛季开始前 N 个自然日的兑换窗口控制（默认 7 天，由环境变量配置）
- 页面 keepalive 缓存

## 相关文档

```text
description/shop/product_list.md
description/shop/point_flow.md
description/shop/exchange.md
```
