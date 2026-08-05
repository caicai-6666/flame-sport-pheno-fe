import { requestDingTalkAuthCode } from './dingtalkAuth'
import { getAppMode } from './authConfig'

export const DEFAULT_AUTH_CODE = process.env.VUE_APP_AUTH_CODE

// 登录凭证由部署模式唯一决定，避免手动覆盖造成启动登录与 401 重登来源不一致。
export function getLoginCredentialSource() {
  return getAppMode() === 'development' ? 'auth_code' : 'dingtalk'
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
