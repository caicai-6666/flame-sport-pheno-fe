import { requestDingTalkAuthCode } from './dingtalkAuth'

export const DEFAULT_AUTH_CODE = process.env.VUE_APP_AUTH_CODE

function getLoginProvider() {
  return String(process.env.VUE_APP_LOGIN_PROVIDER || 'auto').trim().toLowerCase()
}

// auto 跟随 Vue CLI 的构建环境，保证本地即使在钉钉容器中调试也不会触发 Native bridge。
export function getLoginCredentialSource() {
  const loginProvider = getLoginProvider()

  if (loginProvider === 'dingtalk') {
    return 'dingtalk'
  }

  if (loginProvider === 'mock' || loginProvider === 'auth_code') {
    return 'auth_code'
  }

  return process.env.NODE_ENV === 'development' ? 'auth_code' : 'dingtalk'
}

export async function buildLoginPayload() {
  if (getLoginCredentialSource() === 'dingtalk') {
    const { authCode } = await requestDingTalkAuthCode()

    return {
      auth_code: authCode,
      auth_source: 'dingtalk'
    }
  }

  if (!DEFAULT_AUTH_CODE) {
    throw new Error('缺少开发登录 auth_code，请配置 VUE_APP_AUTH_CODE')
  }

  return {
    auth_code: DEFAULT_AUTH_CODE
  }
}
