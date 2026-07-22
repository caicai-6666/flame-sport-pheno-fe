import { reactive } from 'vue'
import { checkProfileComplete, login } from '../api/auth'
import { getAuthCode, setAuthCode } from '../api/authCredential'
import { setUserHealthProfileCompletion, setUserHealthProfileCompletionError } from './userHealthProfileState'

export const authState = reactive({
  authCode: getAuthCode(),
  currentUser: null,
  isLoggingIn: false,
  isLoginReady: false,
  loginStep: 'idle',
  loginError: null
})

export async function initLogin() {
  authState.isLoggingIn = true
  authState.isLoginReady = false
  authState.loginStep = 'getting_credential'
  authState.loginError = null

  try {
    const loginResult = await login({
      onBeforeRequest() {
        authState.loginStep = 'requesting_login'
      }
    })
    setAuthCode(loginResult.authCode)
    authState.authCode = loginResult.authCode
    authState.currentUser = loginResult.user

    try {
      const profileCompletion = await checkProfileComplete()
      setUserHealthProfileCompletion(profileCompletion)
    } catch (profileError) {
      setUserHealthProfileCompletionError(profileError)
    }
  } catch (error) {
    authState.loginError = error
  } finally {
    authState.isLoggingIn = false
    authState.isLoginReady = true
    // 保留失败前所在阶段，才能区分“未拿到免登码”和“后端登录接口失败”。
    authState.loginStep = authState.loginError ? `failed_${authState.loginStep}` : 'ready'
  }
}
