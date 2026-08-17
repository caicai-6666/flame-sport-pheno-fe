# HeaderBar 头像接口

本文说明顶部用户栏的视觉职责、头像接口契约以及图片资源释放和失败降级方式。

## 组件位置

```text
src/components/HeaderBar.vue
src/api/avatar.js
```

`HeaderBar` 展示品牌 Logo、项目详情页返回按钮和当前用户头像。

品牌 Logo 使用带 Alpha 通道的无损 `src/assets/logo.webp`，组件不为图片绘制额外实色背景，透明区域直接显示 Header 背景。生产构建会生成带内容哈希的 WebP 文件，并由容器 Nginx 设置一年不可变缓存；Logo 更新后文件哈希变化，浏览器会自动获取新版本。

---

## `GET /image/avatar` 获取用户头像

### 接口定义

```http
GET /image/avatar
```

### 请求参数

请求头如下：

```http
Authorization: <auth_code>
```

Query 参数和请求体均无。

### 成功响应

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
const avatarBlob = await getAvatarImage();
const avatarUrl = URL.createObjectURL(avatarBlob);
```

### 异常处理

接口超时后会由公共请求层在 400 ms、800 ms 后各自动重试一次；三次均超时或发生其他错误时不阻塞页面，头像保持默认占位文本 `PH`。
