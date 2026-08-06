import request from './request'

function normalizeSuggestionRemark(response) {
  return {
    id: response?.id ?? '',
    createdAt: response?.created_at || response?.createdAt || ''
  }
}

/**
 * 提交用户意见。写操作不使用公共读取重试，避免网络超时后重复创建建议记录。
 */
export async function submitSuggestionRemark(remark) {
  const response = await request.post('/suggestion/remark', {
    remark: String(remark || '').trim()
  })

  return normalizeSuggestionRemark(response)
}
