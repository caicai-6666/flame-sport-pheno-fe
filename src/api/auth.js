import request from './request'
import { LOGIN_PATH } from './authConfig'

// 当前没有登录页，先从环境变量读取鉴权码；本地开发时使用默认配置值。
const DEFAULT_AUTH_CODE = process.env.VUE_APP_AUTH_CODE

/**
 * 登录接口。
 *
 * 当前登录逻辑较简单：前端向后端提交 auth_code，
 * 后端校验成功后写入缓存，并原样返回 auth_code。
 * 后续业务请求会继续使用该 auth_code 访问后端接口。
 */
export async function login(authCode = DEFAULT_AUTH_CODE) {
  const response = await request.post(LOGIN_PATH, {
    auth_code: authCode
  })

  return response.auth_code
}

export { DEFAULT_AUTH_CODE }
