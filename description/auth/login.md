# 登录与鉴权

## 当前版本目标

当前项目不做账号密码登录页。应用作为钉钉 H5 应用运行时，前端通过钉钉 JSAPI 获取一次性免登码，并提交给后端登录接口。后端使用该免登码调用钉钉服务端接口换取真实用户身份，再创建或更新本系统用户，并返回本系统后续业务请求使用的 `auth_code`。

开发构建保留浏览器联调入口：前端直接使用配置好的 `VUE_APP_AUTH_CODE` 请求后端登录接口，不请求钉钉 JSAPI；生产构建默认只走钉钉免登。

后续业务接口通过请求头携带后端返回的 `auth_code`。

## 相关文件

```text
src/main.js
src/api/dingtalkAuth.js
src/api/loginCredential.js
src/state/authState.js
src/api/auth.js
src/api/authCredential.js
src/api/request.js
```

## 环境配置

```env
VUE_APP_API_BASE_URL=/flame/api
VUE_APP_LOGIN_PROVIDER=auto
VUE_APP_DINGTALK_CORP_ID=<钉钉企业 CorpId>
VUE_APP_DINGTALK_CLIENT_ID=<钉钉 H5 应用 ClientId>
VUE_APP_DINGTALK_JSAPI_URL=https://g.alicdn.com/dingding/open-develop/1.9.0/dingtalk.js
VUE_APP_AUTH_CODE=<开发环境用 auth_code>
```

`VUE_APP_LOGIN_PROVIDER` 取值：

| 值 | 说明 |
| --- | --- |
| `auto` | 推荐默认值。`npm run serve` 使用 `VUE_APP_AUTH_CODE`，`npm run build` 使用钉钉免登 |
| `dingtalk` | 强制走钉钉免登 |
| `mock` / `auth_code` | 强制走开发 `auth_code` fallback |

`corpId` 和 `clientId` 也可以通过 URL query 传入，例如：

```text
https://example.com/?corpId=xxx&clientId=xxx#/projects
```

这些钉钉配置仅用于前端调用钉钉 JSAPI 获取一次性免登码。当前后端专门对接本 H5 应用，服务端自行保存并使用固定的钉钉企业与应用配置，前端登录请求不再额外提交 `corp_id` 或 `client_id`。

`requestAuthCode` 的 `clientId` 只能使用应用凭证中的 **Client ID（原 AppKey）**，不能使用 App ID 或原企业内部应用 AgentId；前端也不会再把 URL 中的 `appId` 当作 `clientId` 处理。

## 登录接口

```http
POST /auth/login
```

钉钉环境请求体：

```json
{
  "auth_code": "ding_talk_once_code",
  "auth_source": "dingtalk"
}
```

开发 fallback 请求体：

```json
{
  "auth_code": "dev_auth_code"
}
```

成功响应：

```json
{
  "auth_code": "backend_session_auth_code",
  "user": {
    "id": "string",
    "name": "string",
    "department_id": "string",
    "department_name": "string",
    "avatar_url": "string"
  }
}
```

后端要求：

1. 钉钉登录时，`auth_code` 是钉钉一次性免登码，不是前端后续请求头使用的会话码。
2. 后端应使用服务端固定配置的钉钉企业与应用凭证，调用钉钉服务端接口换取钉钉用户 ID。
3. 后端应按钉钉用户 ID 查找或创建本系统 `user`，同步姓名、部门、头像等基础信息。
4. 后端应返回本系统自己的 `auth_code`，后续业务接口通过该值识别当前用户。
5. 登录失败时返回非 2xx，并提供 `message` 便于前端展示。

## 前端启动流程

```text
main.js
  -> initLogin()
    -> loginCredential.buildLoginPayload()
      -> 开发构建（NODE_ENV=development）：读取 VUE_APP_AUTH_CODE
      -> 生产构建（NODE_ENV=production）：dd.runtime.permission.requestAuthCode()
    -> POST /auth/login
    -> 保存后端返回的 auth_code 和 user
    -> checkProfileComplete()
      -> GET /auth/profile_complete_check
```

页面会先挂载登录状态层，但在登录成功前不会创建路由页面或发起业务接口。这样钉钉 JSAPI、免登配置或网络导致免登码获取失败时，用户能看到具体错误并重试；若此阶段未取得登录凭证，`POST /auth/login` 不会发生，这是正常的调用顺序。

## 钉钉 JSAPI 加载与超时

`public/index.html` 会在 `app.js` 前同步加载钉钉官方 JSAPI（`https://g.alicdn.com/dingding/open-develop/1.9.0/dingtalk.js`），并提前注册 `dd.ready`。这是为了避免部分钉钉 Android 客户端在前端动态加载 SDK 前就发出 `runtimeready`，从而使 Native bridge 永远不初始化。SDK 地址在入口 HTML 中固定，确保 `npm run serve` 与生产构建得到同样的加载时序；`VUE_APP_DINGTALK_JSAPI_URL` 仅保留给运行时动态加载兜底。

`requestAuthCode` 会先等待 Native bridge 就绪，并同时兼容旧版 `onSuccess` / `onFail` 回调和新版 Promise 返回值；若 SDK 加载超过 8 秒、Native bridge 超过 8 秒未就绪、或授权码调用超过 10 秒仍无回调，页面会退出等待态并显示明确错误，而不会无限停在“正在获取钉钉免登授权码”。

登录成功后：

1. 写入 `authState.authCode`
2. 写入 `authState.currentUser`
3. 将 `auth_code` 写入 `localStorage`
4. 后续请求由 `request.js` 自动注入 `Authorization`
5. 请求 `/auth/profile_complete_check` 检查健康基础信息是否完整
6. 如果后端返回资料未完成且 `missing_fields` 非空，展示健康信息采集弹窗

本地存储 key：

```text
flame_sport_pheno_auth_code
```

如果 `localStorage` 不可用，会退化为内存变量。

## 自动重新登录

除 `/auth/login` 外，任意业务接口返回 `401` 时，前端会自动重新登录并重试原请求一次。

钉钉免登码是一次性的，因此生产构建的 `401` 自动重登时前端会重新调用 `dd.runtime.permission.requestAuthCode()` 获取新 code，再请求 `/auth/login`；开发构建则再次读取 `VUE_APP_AUTH_CODE`。

登录接口本身失败时不会自动重试。页面会展示登录失败提示和“重试”按钮。
