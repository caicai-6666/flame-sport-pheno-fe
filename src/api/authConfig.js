export const LOGIN_PATH = '/auth/login'

export function getAppMode() {
  const appMode = String(process.env.VUE_APP_MODE || '').trim().toLowerCase()

  if (appMode === 'development' || appMode === 'production') {
    return appMode
  }

  // 环境变量缺失或无效时按构建环境回退，避免登录流程和 API 地址采用不同模式。
  return process.env.NODE_ENV === 'development' ? 'development' : 'production'
}
