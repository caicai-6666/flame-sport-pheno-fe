import axios from 'axios'
import { resolveApiBaseUrl } from './apiBaseUrl'
import { LOGIN_PATH } from './authConfig'
import { getAuthCode, setAuthCode } from './authCredential'
import { buildLoginPayload } from './loginCredential'

// 生产环境与页面同部署在 /flame 下，未配置环境变量时统一请求该应用的 API 前缀。
const API_BASE_URL = resolveApiBaseUrl()
const REQUEST_TIMEOUT = 15000
const TIMEOUT_RETRY_LIMIT = 2
const TIMEOUT_RETRY_DELAY = 400
const RETRYABLE_READ_METHODS = new Set(['get', 'head', 'options'])

const request = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT
})

function isLoginRequest(config) {
  return config?.url === LOGIN_PATH
}

function isTimeoutError(error) {
  return error?.code === 'ECONNABORTED' ||
    error?.code === 'ETIMEDOUT' ||
    /timeout/i.test(error?.message || '')
}

function shouldRetryTimeout(config, error) {
  return Boolean(
    config &&
    !isLoginRequest(config) &&
    RETRYABLE_READ_METHODS.has(String(config.method || 'get').toLowerCase()) &&
    isTimeoutError(error)
  )
}

function waitForRetry(delay) {
  return new Promise(resolve => window.setTimeout(resolve, delay))
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

    if (shouldRetryTimeout(originalConfig, error)) {
      const retryCount = originalConfig._timeoutRetryCount || 0

      if (retryCount < TIMEOUT_RETRY_LIMIT) {
        originalConfig._timeoutRetryCount = retryCount + 1
        // 仅重试幂等读取请求，避免写操作在服务端已成功但响应超时时被重复提交。
        await waitForRetry(TIMEOUT_RETRY_DELAY * (retryCount + 1))
        return request(originalConfig)
      }
    }

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
