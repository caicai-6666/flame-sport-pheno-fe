const REVIEW_STATUS_TEXT_MAP = {
  pending: '待初审',
  preliminary_approved: '初审通过',
  preliminary_rejected: '初审失败',
  approved: '终审通过',
  rejected: '终审失败',
  reviewed: '已审核'
}

const REVIEW_STATUSES = new Set(Object.keys(REVIEW_STATUS_TEXT_MAP))

/**
 * 后端审核状态扩展后统一在此收口，未知值降级为待初审，避免页面出现无含义的状态标签。
 */
export function normalizeReviewStatus(status, fallback = 'pending') {
  const normalizedStatus = String(status || '').trim().toLowerCase()

  return REVIEW_STATUSES.has(normalizedStatus) ? normalizedStatus : fallback
}

export function getReviewStatusText(status) {
  return REVIEW_STATUS_TEXT_MAP[normalizeReviewStatus(status)] || REVIEW_STATUS_TEXT_MAP.pending
}
