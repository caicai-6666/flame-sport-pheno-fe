import { reactive } from 'vue'
import { checkProfileComplete, login } from '../api/auth'
import { getAuthCode, setAuthCode } from '../api/authCredential'
import { setUserHealthProfileCompletion, setUserHealthProfileCompletionError } from './userHealthProfileState'

export const authState = reactive({
  authCode: getAuthCode(),
  currentUser: null,
  isLoggingIn: false,
  isLoginReady: false,
  loginError: null
})

export async function initLogin() {
  authState.isLoggingIn = true
  authState.loginError = null

  try {
    const loginResult = await login()
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
  }
}
