# 通用接口约定

## 基础地址

前端通过环境变量配置后端地址：

```env
VUE_APP_API_BASE_URL=http://127.0.0.1:8000
```

如果没有配置，前端默认使用：

```text
http://127.0.0.1:8000
```

## 鉴权请求头

除 `/auth/login` 外，业务请求会自动携带：

```http
Authorization: <auth_code>
```

当前约定：

- 请求头字段名为 `Authorization`
- 请求头值直接使用 `auth_code`
- 不添加 `Bearer` 前缀

## 响应格式兼容

当前前端处于联调阶段，部分接口同时兼容数组直出和对象包装。

推荐后端逐步收敛为文档中的“推荐格式”。兼容字段只用于降低联调成本，不应作为长期契约。

## 401 自动处理

如果非登录接口返回 `401 Unauthorized`：

1. 前端重新构造登录凭证
   - 钉钉环境重新调用 `dd.runtime.permission.requestAuthCode()` 获取一次性免登码
   - 非钉钉环境继续使用 `VUE_APP_AUTH_CODE`
2. 前端重新请求 `/auth/login`
3. 更新本地 `auth_code`
4. 自动重试原业务请求一次

同一个请求最多自动重试一次，避免死循环。

## 错误响应建议

推荐错误响应：

```json
{
  "message": "错误原因"
}
```

前端请求封装会归一化错误对象：

```js
{
  message,
  status,
  data,
  originalError
}
```

页面是否展示错误由具体交互决定。项目上传凭证提交失败时，当前仅通过按钮状态反馈，不额外展示错误文案。
