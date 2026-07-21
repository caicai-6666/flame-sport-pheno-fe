const AUTH_CODE_KEY = 'flame_sport_pheno_auth_code'

let memoryAuthCode = ''

export function getAuthCode() {
  try {
    return window.localStorage.getItem(AUTH_CODE_KEY) || memoryAuthCode
  } catch (error) {
    return memoryAuthCode
  }
}

export function setAuthCode(authCode) {
  memoryAuthCode = authCode ? String(authCode) : ''

  try {
    if (memoryAuthCode) {
      window.localStorage.setItem(AUTH_CODE_KEY, memoryAuthCode)
    } else {
      window.localStorage.removeItem(AUTH_CODE_KEY)
    }
  } catch (error) {
    // 某些浏览器隐私模式下 localStorage 可能不可用，此时只使用内存变量。
  }
}

export function clearAuthCode() {
  setAuthCode('')
}
