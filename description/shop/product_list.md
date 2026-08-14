# 奖品列表

## 相关文件

```text
src/views/ShopView.vue
src/components/ShopPage.vue
src/api/shop.js
```

## 奖品列表接口

```http
GET /shop/product_info
```

请求参数：无。

推荐响应：

```json
[
  {
    "id": 1,
    "name": "Keep 弹力带-入门款",
    "description": "适合热身、拉伸和基础力量训练。",
    "points_required": 30,
    "image_url": "/Keep 弹力带-入门款.jpg"
  }
]
```

## 奖品图片接口

```http
GET /image/product
```

请求参数：

| 参数 | 说明 |
| ---- | ---- |
| filename | 从 `image_url` 中解析出的图片文件名 |

示例：

```http
GET /image/product?filename=Keep%20%E5%BC%B9%E5%8A%9B%E5%B8%A6-%E5%85%A5%E9%97%A8%E6%AC%BE.jpg
```

前端以 `blob` 方式接收图片，并生成本地 `objectURL` 用于商品卡片展示。

奖品基础信息加载完成后会先渲染商品列表，再按分档顺序逐档请求图片：

```text
疯狂积分兑 -> 积分20 -> 积分30 -> ... -> 积分200+
```

同一档内按商品顺序逐个请求图片，避免一次性请求全部商品图片。

## 字段映射

| 后端字段 | 前端字段 | 说明 |
| -------- | -------- | ---- |
| id | id | 奖品 ID，后续兑换使用 |
| name | name | 奖品名称 |
| description | description | 奖品说明 |
| points_required | pointsRequired | 兑换所需积分 |
| image_url | imageUrl | 后端返回的图片路径 |

## 分档规则

奖品按 `pointsRequired` 分档展示。

展示顺序：

| 档位 | 范围 |
| ---- | ---- |
| 疯狂积分兑 | `pointsRequired >= 550` |
| 积分20 | `pointsRequired <= 20` |
| 积分30 | `20 < pointsRequired <= 30` |
| 积分40 | `30 < pointsRequired <= 40` |
| 积分50 | `40 < pointsRequired <= 50` |
| 积分60 | `50 < pointsRequired <= 60` |
| 积分80 | `60 < pointsRequired <= 80` |
| 积分100 | `80 < pointsRequired <= 100` |
| 积分150 | `100 < pointsRequired <= 150` |
| 积分200 | `150 < pointsRequired <= 200` |
| 积分200+ | `200 < pointsRequired < 550` |

没有奖品的档位不展示。
档位标题不展示“档1”这类编号，也不展示该档商品数量。除“疯狂积分兑”外，其余档位统一按“积分 + 分值”的斜体标题展示。20～200 的固定积分档不在商品卡片内重复分值；“积分200+”包含不同兑换价，每张卡片必须单独展示 `pointsRequired`，“疯狂积分兑”也继续展示单品实际积分。

## 图片展示

- 普通档位使用瀑布流布局展示奖品卡片。
- 商品图片按原始比例完整展示，不裁切图片内容。
- 图片请求中展示柔和 shimmer 占位，不使用转圈动画。
- 图片资源加载完成后淡入展示，避免突然出现。
- 单张图片遇到超时、断网、`408`、`429` 或 `5xx` 时，前端会在短暂退避后自动重试，最多共请求 3 次；明确的客户端错误（如 `404`）不会重试。三次均失败后展示奖品名称占位，不影响其余奖品继续加载。
- 图片二进制获取成功、但浏览器仍无法解码时，也会释放对应 object URL 并退回奖品名称占位，避免加载占位持续不消失。
- 图片高度会影响卡片高度，由瀑布流布局消化不同图片比例造成的高度差。
- “疯狂积分兑”保持单行横向奖品卡样式，图片同样完整展示。
