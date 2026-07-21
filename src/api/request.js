import axios from 'axios'
import { LOGIN_PATH } from './authConfig'
import { getAuthCode, setAuthCode } from './authCredential'
import { buildLoginPayload } from './loginCredential'

const API_BASE_URL = process.env.VUE_APP_API_BASE_URL || 'http://127.0.0.1:8000/api'
const REQUEST_TIMEOUT = 15000

const request = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT
})

function isLoginRequest(config) {
  return config?.url === LOGIN_PATH
}

// 401 表示后端会话已失效，此时重新登录一次获取可用鉴权码。
async function refreshAuthCode() {
  const response = await axios.post(LOGIN_PATH, await buildLoginPayload(), {
    baseURL: API_BASE_URL,
    timeout: REQUEST_TIMEOUT
  })

  const authCode = response.data?.auth_code || response.data?.authCode || response.data?.token || response.data?.access_token

  if (!authCode) {
    throw new Error('登录接口未返回 auth_code')
  }

  setAuthCode(authCode)

  return authCode
}

request.interceptors.request.use(
  config => {
    const authCode = getAuthCode()

    if (authCode && !isLoginRequest(config)) {
      config.headers.Authorization = authCode
    }

    return config
  },
  error => Promise.reject(error)
)

request.interceptors.response.use(
  response => response.data,
  async error => {
    const originalConfig = error.config

    if (
      error.response?.status === 401 &&
      originalConfig &&
      !isLoginRequest(originalConfig) &&
      !originalConfig._retryAfterLogin
    ) {
      originalConfig._retryAfterLogin = true

      const authCode = await refreshAuthCode()
      originalConfig.headers = originalConfig.headers || {}
      originalConfig.headers.Authorization = authCode

      return request(originalConfig)
    }

    const normalizedError = {
      message: error.response?.data?.message || error.message || '请求失败',
      status: error.response?.status,
      data: error.response?.data,
      originalError: error
    }

    return Promise.reject(normalizedError)
  }
)

export default request
