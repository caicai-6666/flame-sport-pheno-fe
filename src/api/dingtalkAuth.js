const DEFAULT_DINGTALK_JSAPI_URL = 'https://g.alicdn.com/dingding/open-develop/1.9.0/dingtalk.js'
const DINGTALK_SCRIPT_ID = 'dingtalk-jsapi'

let dingtalkSdkPromise = null

function getDingTalkGlobal() {
  return window.dd || window.DD || null
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function readSearchParamsFromHash() {
  const hash = window.location.hash || ''
  const queryStart = hash.indexOf('?')

  if (queryStart < 0) {
    return new URLSearchParams()
  }

  return new URLSearchParams(hash.slice(queryStart + 1))
}

function readRuntimeParam(names) {
  const searchParams = new URLSearchParams(window.location.search)
  const hashParams = readSearchParamsFromHash()

  for (const name of names) {
    const value = searchParams.get(name) || hashParams.get(name)

    if (value) {
      return value
    }
  }

  return ''
}

function normalizeDingTalkError(error) {
  if (!error) {
    return new Error('钉钉免登失败')
  }

  if (error instanceof Error) {
    return error
  }

  const message = error.errorMessage || error.errmsg || error.message || '钉钉免登失败'
  const normalizedError = new Error(message)
  normalizedError.data = error

  return normalizedError
}

function loadDingTalkSdk() {
  if (!isBrowser()) {
    return Promise.reject(new Error('当前环境不支持钉钉免登'))
  }

  const existingDingTalk = getDingTalkGlobal()

  if (existingDingTalk) {
    return Promise.resolve(existingDingTalk)
  }

  if (dingtalkSdkPromise) {
    return dingtalkSdkPromise
  }

  dingtalkSdkPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(DINGTALK_SCRIPT_ID)
    const script = existingScript || document.createElement('script')

    script.id = DINGTALK_SCRIPT_ID
    script.async = true
    script.src = process.env.VUE_APP_DINGTALK_JSAPI_URL || DEFAULT_DINGTALK_JSAPI_URL

    script.addEventListener('load', () => {
      const dingtalk = getDingTalkGlobal()

      if (dingtalk) {
        resolve(dingtalk)
        return
      }

      reject(new Error('钉钉 JSAPI 加载成功但未初始化'))
    }, { once: true })

    script.addEventListener('error', () => {
      reject(new Error('钉钉 JSAPI 加载失败'))
    }, { once: true })

    if (!existingScript) {
      document.head.appendChild(script)
    }
  })

  return dingtalkSdkPromise
}

export function isDingTalkClient() {
  if (!isBrowser()) {
    return false
  }

  return /DingTalk|AliApp\(DingTalk/i.test(window.navigator.userAgent)
}

export function getDingTalkCorpId() {
  if (!isBrowser()) {
    return process.env.VUE_APP_DINGTALK_CORP_ID || ''
  }

  return process.env.VUE_APP_DINGTALK_CORP_ID ||
    readRuntimeParam(['corpId', 'corpid', 'corp_id'])
}

export function getDingTalkClientId() {
  if (!isBrowser()) {
    return process.env.VUE_APP_DINGTALK_CLIENT_ID || ''
  }

  return process.env.VUE_APP_DINGTALK_CLIENT_ID ||
    readRuntimeParam(['clientId', 'client_id', 'appId', 'appid'])
}

export async function requestDingTalkAuthCode() {
  const corpId = getDingTalkCorpId()
  const clientId = getDingTalkClientId()

  if (!corpId) {
    throw new Error('缺少钉钉企业 CorpId，请配置 VUE_APP_DINGTALK_CORP_ID 或在 URL 中携带 corpId')
  }

  if (!clientId) {
    throw new Error('缺少钉钉应用 ClientId，请配置 VUE_APP_DINGTALK_CLIENT_ID 或在 URL 中携带 clientId')
  }

  const dingtalk = await loadDingTalkSdk()
  const permission = dingtalk?.runtime?.permission

  if (typeof permission?.requestAuthCode !== 'function') {
    throw new Error('当前钉钉 JSAPI 不支持 requestAuthCode')
  }

  return new Promise((resolve, reject) => {
    permission.requestAuthCode({
      corpId,
      clientId,
      onSuccess(result) {
        const authCode = result?.code || result?.authCode || result?.auth_code

        if (!authCode) {
          reject(new Error('钉钉免登未返回 authCode'))
          return
        }

        resolve({
          authCode,
          corpId,
          clientId
        })
      },
      onFail(error) {
        reject(normalizeDingTalkError(error))
      }
    })
  })
}
