const DINGTALK_CLOSE_TIMEOUT = 2400

function getDingTalkGlobal() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.dd || window.DD || null
}

function normalizeDingTalkNavigationError(error) {
  if (error instanceof Error) {
    return error
  }

  const message = error?.errorMessage || error?.errmsg || error?.message || '钉钉未能关闭当前页面'
  const normalizedError = new Error(message)
  normalizedError.data = error
  return normalizedError
}

export function closeDingTalkApplication() {
  const dingtalk = getDingTalkGlobal()
  const closePage = dingtalk?.biz?.navigation?.close

  if (typeof closePage !== 'function') {
    return Promise.reject(new Error('当前环境不支持直接退出，请在钉钉移动端内使用'))
  }

  return new Promise((resolve, reject) => {
    let isSettled = false
    const closeTimeout = window.setTimeout(() => {
      settle(reject, new Error('退出请求未收到钉钉客户端响应，请稍后重试'))
    }, DINGTALK_CLOSE_TIMEOUT)

    const settle = (callback, value) => {
      if (isSettled) {
        return
      }

      isSettled = true
      window.clearTimeout(closeTimeout)
      callback(value)
    }
    const handleSuccess = result => settle(resolve, result)
    const handleFail = error => settle(reject, normalizeDingTalkNavigationError(error))

    try {
      const result = closePage.call(dingtalk.biz.navigation, {
        onSuccess: handleSuccess,
        onFail: handleFail
      })

      // 新版 JSAPI 可能返回 Promise，旧版则只触发回调，两种调用形态均需兼容。
      if (result && typeof result.then === 'function') {
        result.then(handleSuccess, handleFail)
      }
    } catch (error) {
      handleFail(error)
    }
  })
}
