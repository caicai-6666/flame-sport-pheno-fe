# 通用接口约定

## 基础地址

前端通过环境变量配置后端地址；生产环境默认使用与页面同域的 `/flame/api`：

```env
VUE_APP_API_BASE_URL=/flame/api
```

`VUE_APP_API_BASE_URL` 始终配置普通 `/flame/api` 地址。`VUE_APP_MODE=development` 时，前端请求层会自动在标准 API 路径前插入 `/dev`，例如 `/flame/api` 转换为 `/dev/flame/api`，`https://www.phenosolar.cloud/flame/api` 转换为 `https://www.phenosolar.cloud/dev/flame/api`。已经包含 `/dev/flame/api` 或不使用标准 `/flame/api` 路径的自定义地址不会被重复或额外改写。生产模式保持配置值不变。

如果没有配置，前端默认使用：

```text
/flame/api
```

例如项目接口路径为 `/project/list` 时，实际请求路径为 `/flame/api/project/list`。本地联调可在 `../../.env` 中覆盖为实际后端地址，但应保留 `/flame/api` 路径前缀。

---

## 鉴权请求头

除 `/auth/login` 外，业务请求会自动携带：

```http
Authorization: <auth_code>
```

当前约定：

- 请求头字段名为 `Authorization`
- 请求头值直接使用 `auth_code`
- 不添加 `Bearer` 前缀

---

## 响应格式兼容

当前前端处于联调阶段，部分接口同时兼容数组直出和对象包装。

推荐后端逐步收敛为文档中的“推荐格式”。兼容字段只用于降低联调成本，不应作为长期契约。

---

## 401 自动处理

如果非登录接口返回 `401 Unauthorized`：

1. 前端重新构造登录凭证
   - `VUE_APP_MODE=development` 继续使用 `VUE_APP_AUTH_CODE`
   - `VUE_APP_MODE=production` 重新调用 `dd.runtime.permission.requestAuthCode()` 获取一次性免登码
2. 前端重新请求 `/auth/login`
3. 更新本地 `auth_code`
4. 自动重试原业务请求一次

同一个请求最多自动重试一次，避免死循环。

---

## 读取请求超时重试

公共请求层对除 `/auth/login` 外的 `GET`、`HEAD`、`OPTIONS` 请求设置 15 秒超时。发生 Axios 超时（`ECONNABORTED`、`ETIMEDOUT` 或超时消息）后，前端会在 400 ms、800 ms 退避等待后自动重试，最多额外请求 2 次，即单次读取操作最多发起 3 次请求。

该机制覆盖头像、当前赛季、赛季报名/目标状态、项目列表及其图片、项目规则等读取接口。普通 `4xx`、`5xx`、断网等非超时错误不会由该机制重试，仍交由页面展示错误或恢复状态。`POST`、`PUT`、`PATCH`、`DELETE` 等写操作不自动重试，避免服务端已完成操作但响应丢失时产生重复报名、兑换或上传。

---

## 错误响应建议

推荐错误响应：

```json
{
  "message": "错误原因"
}
```

同时兼容 FastAPI 默认业务异常格式：

```json
{
  "detail": "错误原因"
}
```

前端优先读取 `message`，其次读取 `detail`，并归一化为统一错误对象：

```js
{
  message, status, data, originalError;
}
```

页面是否展示错误由具体交互决定。项目上传凭证提交失败时，当前仅通过按钮状态反馈，不额外展示错误文案。
