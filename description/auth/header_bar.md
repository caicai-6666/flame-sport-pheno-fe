# HeaderBar 头像接口

## 组件位置

```text
src/components/HeaderBar.vue
src/api/avatar.js
```

`HeaderBar` 展示品牌 Logo、项目详情页返回按钮和当前用户头像。

## 获取用户头像

```http
GET /image/avatar
```

请求头：

```http
Authorization: <auth_code>
```

请求参数：无。

响应为图片二进制数据，建议后端设置：

```http
Content-Type: image/png
```

或：

```http
Content-Type: image/jpeg
```

前端以 `Blob` 接收：

```js
const avatarBlob = await getAvatarImage()
const avatarUrl = URL.createObjectURL(avatarBlob)
```

失败时不阻塞页面，头像保持默认占位文本 `CA`。
