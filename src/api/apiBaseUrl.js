import { getAppMode } from './authConfig'

const DEFAULT_API_BASE_URL = '/flame/api'
const API_PATH = '/flame/api'
const DEVELOPMENT_API_PATH = `/dev${API_PATH}`

function addDevelopmentPrefix(baseUrl) {
  if (baseUrl.includes(DEVELOPMENT_API_PATH)) {
    return baseUrl
  }

  const apiPathIndex = baseUrl.indexOf(API_PATH)

  if (apiPathIndex < 0) {
    return baseUrl
  }

  return `${baseUrl.slice(0, apiPathIndex)}/dev${baseUrl.slice(apiPathIndex)}`
}

export function resolveApiBaseUrl(configuredBaseUrl = process.env.VUE_APP_API_BASE_URL) {
  const baseUrl = String(configuredBaseUrl || DEFAULT_API_BASE_URL).trim() || DEFAULT_API_BASE_URL

  // 开发模式统一走宿主机 /dev 代理；只处理标准 API 路径，避免改写其他自定义后端地址。
  return getAppMode() === 'development'
    ? addDevelopmentPrefix(baseUrl)
    : baseUrl
}
