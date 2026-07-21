import request from './request'

const HISTORY_ACCENTS = [
  '#68d65c',
  '#ff9f45',
  '#7b8cff',
  '#20c7b5',
  '#ff6f91',
  '#4f9cff'
]

function getProofFileName(record) {
  const fileName = record.file_name || record.fileName || record.filename

  if (fileName) {
    return fileName
  }

  const imageUrl = record.image_url || record.imageUrl || ''
  const [pathWithoutQuery] = imageUrl.split('?')
  const segments = pathWithoutQuery.split('/').filter(Boolean)

  return segments[segments.length - 1] || 'proof.jpg'
}

function normalizeCurrentSeasonRecord(record, index) {
  const project = record.project || {}
  const uploadConfig = record.upload_config || record.project_upload_config || {}

  return {
    id: String(record.id || record.proof_record_id || `${record.projectName || record.project_name || record.project_id || index}-${record.createdAt || record.created_at || index}`),
    seasonName: record.season_name || record.seasonName || '',
    projectId: String(record.project_id || project.id || ''),
    taskName: record.project_name || record.projectName || project.name || record.taskName || '',
    fileName: record.image_name || record.imageName || getProofFileName(record),
    note: record.note || '',
    recordType: record.record_type || uploadConfig.record_type || record.recordType || '',
    reviewStatus: record.review_status || record.reviewStatus || 'pending',
    bmi: record.bmi || '',
    accent: record.accent || HISTORY_ACCENTS[index % HISTORY_ACCENTS.length],
    uploadedAt: record.created_at || record.createdAt || record.uploaded_at || record.uploadedAt || ''
  }
}

function normalizePastSeasonResult(record) {
  const result = record.result || record.review_status || record.reviewStatus

  if (result) {
    return result
  }

  const reviewComment = record.review_comment || record.reviewComment || ''

  if (reviewComment.includes('不通过') || reviewComment.includes('拒绝')) {
    return 'rejected'
  }

  if (reviewComment.includes('通过')) {
    return 'approved'
  }

  return 'reviewed'
}

function normalizePastSeasonRecord(record, index) {
  const uploadedAt = record.created_at || record.createdAt || record.uploaded_at || record.uploadedAt || ''

  return {
    id: String(record.id || record.proof_record_id || `${record.seasonName || record.season_name || index}-${record.projectName || record.project_name || index}-${uploadedAt || index}`),
    seasonName: record.season_name || record.seasonName || '',
    taskName: record.project_name || record.projectName || record.taskName || '',
    fileName: record.image_name || record.imageName || getProofFileName(record),
    note: record.review_comment || record.reviewComment || record.note || '',
    result: normalizePastSeasonResult(record),
    accent: record.accent || HISTORY_ACCENTS[index % HISTORY_ACCENTS.length],
    uploadedAt
  }
}

/**
 * 获取当前赛季上传凭证记录。
 *
 * 仅在用户已经参与当前赛季后调用。未参与时 HistoryPage 不展示本赛季记录。
 */
export async function getCurrentSeasonUploadRecords() {
  const response = await request.get('/proof/current')
  const records = Array.isArray(response) ? response : response.records

  return (records || []).map(normalizeCurrentSeasonRecord)
}

/**
 * 获取过往赛季凭证记录。
 *
 * 返回记录中的 createdAt 表示凭证上传时间，不表示审核时间。
 */
export async function getPastSeasonProofHistory() {
  const response = await request.get('/proof/history')
  const records = Array.isArray(response) ? response : response.records

  return (records || []).map(normalizePastSeasonRecord)
}
