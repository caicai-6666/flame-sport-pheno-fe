# 登录与鉴权

## 当前版本目标

当前项目暂时不做账号密码登录页。前端启动后使用配置好的 `auth_code` 请求后端登录接口，后端校验成功后将该 `auth_code` 写入缓存，并返回给前端。

后续业务接口通过请求头携带该 `auth_code`。

## 相关文件

```text
src/main.js
src/state/authState.js
src/api/auth.js
src/api/authCredential.js
src/api/request.js
```

## 环境配置

```env
VUE_APP_API_BASE_URL=http://127.0.0.1:8000
VUE_APP_AUTH_CODE=<开发用 auth_code>
```

## 登录接口

```http
POST /auth/login
```

请求体：

```json
{
  "auth_code": "string"
}
```

成功响应：

```json
{
  "auth_code": "string"
}
```

## 前端启动流程

```text
main.js
  -> initLogin()
    -> login()
      -> POST /auth/login
```

登录成功后：

1. 写入 `authState.authCode`
2. 写入 `localStorage`
3. 后续请求由 `request.js` 自动注入 `Authorization`

本地存储 key：

```text
flame_winter_auth_code
```

如果 `localStorage` 不可用，会退化为内存变量。

## 自动重新登录

除 `/auth/login` 外，任意业务接口返回 `401` 时，前端会自动重新登录并重试原请求一次。

登录接口本身失败时不会自动重试。
