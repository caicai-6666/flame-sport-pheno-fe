import request from './request'
import { LOGIN_PATH } from './authConfig'
import { buildLoginPayload, DEFAULT_AUTH_CODE } from './loginCredential'

function normalizeCurrentUser(user) {
  if (!user) {
    return null
  }

  return {
    id: String(user.id || user.user_id || user.userId || ''),
    name: user.name || user.user_name || user.userName || '',
    departmentId: String(user.department_id || user.departmentId || ''),
    departmentName: user.department_name || user.departmentName || '',
    avatarUrl: user.avatar_url || user.avatarUrl || ''
  }
}

function normalizeLoginResult(response) {
  return {
    authCode: response?.auth_code || response?.authCode || response?.token || response?.access_token || '',
    authSource: response?.auth_source || response?.authSource || '',
    user: normalizeCurrentUser(response?.user || response?.current_user || response?.currentUser)
  }
}

/**
 * 登录接口。
 *
 * 钉钉环境会先获取 H5 免登码，再交给后端换取当前系统会话 auth_code。
 * 非钉钉环境继续使用 VUE_APP_AUTH_CODE 作为本地开发 fallback。
 */
export async function login({ onBeforeRequest } = {}) {
  const loginPayload = await buildLoginPayload()

  // 免登码拿到之后才会请求后端，调用方据此可以准确提示故障发生位置。
  onBeforeRequest?.()
  const response = await request.post(LOGIN_PATH, loginPayload)

  const loginResult = normalizeLoginResult(response)

  if (!loginResult.authCode) {
    throw new Error('登录接口未返回 auth_code')
  }

  return loginResult
}

export async function checkProfileComplete() {
  const response = await request.get('/auth/profile_complete_check')
  const missingFields = Array.isArray(response?.missing_fields)
    ? response.missing_fields
    : []

  return {
    isComplete: Boolean(response?.is_complete ?? response?.isComplete),
    heightCmCompleted: Boolean(response?.height_cm_completed ?? response?.heightCmCompleted),
    missingFields
  }
}

export { DEFAULT_AUTH_CODE }
