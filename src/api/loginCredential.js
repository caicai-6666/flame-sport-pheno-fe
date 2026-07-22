import { isDingTalkClient, requestDingTalkAuthCode } from './dingtalkAuth'

export const DEFAULT_AUTH_CODE = process.env.VUE_APP_AUTH_CODE

function getLoginProvider() {
  return String(process.env.VUE_APP_LOGIN_PROVIDER || 'auto').trim().toLowerCase()
}

function shouldUseDingTalkLogin() {
  const loginProvider = getLoginProvider()

  if (loginProvider === 'dingtalk') {
    return true
  }

  if (loginProvider === 'mock' || loginProvider === 'auth_code') {
    return false
  }

  return isDingTalkClient()
}

export async function buildLoginPayload() {
  if (shouldUseDingTalkLogin()) {
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
