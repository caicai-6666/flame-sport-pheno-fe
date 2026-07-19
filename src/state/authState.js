import { reactive } from 'vue'
import { DEFAULT_AUTH_CODE, login } from '../api/auth'
import { getAuthCode, setAuthCode } from '../api/authCredential'

export const authState = reactive({
  authCode: getAuthCode(),
  isLoggingIn: false,
  isLoginReady: false,
  loginError: null
})

export async function initLogin() {
  authState.isLoggingIn = true
  authState.loginError = null

  try {
    const authCode = await login(DEFAULT_AUTH_CODE)
    setAuthCode(authCode)
    authState.authCode = authCode
  } catch (error) {
    authState.loginError = error
  } finally {
    authState.isLoggingIn = false
    authState.isLoginReady = true
  }
}
