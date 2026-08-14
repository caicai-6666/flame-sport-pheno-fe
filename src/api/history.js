import request from './request'
import { normalizeReviewStatus } from '../utils/proofReview'

const HISTORY_ACCENTS = [
  '#68d65c',
  '#ff9f45',
  '#7b8cff',
  '#20c7b5',
  '#ff6f91',
  '#4f9cff'
]

const API_PATH = '/flame/api'

function toApiRelativePath(imageUrl) {
  const url = String(imageUrl || '').trim()
  const apiPathIndex = url.indexOf(API_PATH)

  if (apiPathIndex < 0) {
    return url
  }

  // Axios 会把以 / 开头的地址仍与 baseURL 合并；剥离后统一由 request 的
  // /flame/api（生产）或 /dev/flame/api（开发）baseURL 添加唯一一次前缀。
  return url.slice(apiPathIndex + API_PATH.length) || '/'
}

function getProofFileName(record) {
  const fileName = record.imageName || record.image_name || record.file_name || record.fileName || record.filename

  if (fileName) {
    return fileName
  }

  const imageUrl = record.image_url || record.imageUrl || ''
  const [pathWithoutQuery] = imageUrl.split('?')
  const segments = pathWithoutQuery.split('/').filter(Boolean)

  return segments[segments.length - 1] || 'proof.webp'
}

function normalizeCurrentSeasonRecord(record, index) {
  const project = record.project || {}
  const uploadConfig = record.upload_config || record.project_upload_config || {}
  // /proof/current 已升级为 camelCase 响应，旧字段仅用于兼容尚未同步的联调环境。
  const projectName = record.projectName || record.project_name || project.name || record.taskName || ''
  const createdAt = record.createdAt || record.created_at || record.uploadedAt || record.uploaded_at || ''

  return {
    id: String(record.id || record.proof_record_id || `${projectName || record.project_id || index}-${createdAt || index}`),
    seasonName: record.seasonName || record.season_name || '',
    projectId: String(record.project_id || project.id || ''),
    taskName: projectName,
    fileName: record.imageName || record.image_name || getProofFileName(record),
    imageUrl: String(record.imageUrl || record.image_url || '').trim(),
    note: record.note || '',
    recordType: record.record_type || uploadConfig.record_type || record.recordType || '',
    reviewStatus: normalizeReviewStatus(record.reviewStatus || record.review_status),
    reviewComment: String(record.reviewComment || record.review_comment || '').trim(),
    bmi: record.bmi || '',
    accent: record.accent || HISTORY_ACCENTS[index % HISTORY_ACCENTS.length],
    proofDate: record.proofDate || record.proof_date || '',
    uploadedAt: createdAt
  }
}

function normalizePastSeasonResult(record) {
  const result = normalizeReviewStatus(record.reviewStatus || record.review_status || record.result, '')

  if (result) {
    return result
  }

  const reviewComment = record.reviewComment || record.review_comment || ''

  if (reviewComment.includes('不通过') || reviewComment.includes('拒绝')) {
    return 'rejected'
  }

  if (reviewComment.includes('通过')) {
    return 'approved'
  }

  return 'reviewed'
}

function normalizePastSeasonRecord(record, index) {
  // /proof/history 仅返回已归档赛季，采用与 /proof/current 一致的 camelCase 字段。
  const seasonName = record.seasonName || record.season_name || ''
  const projectName = record.projectName || record.project_name || record.taskName || ''
  const reviewComment = String(record.reviewComment || record.review_comment || '').trim()
  const uploadedAt = record.createdAt || record.created_at || record.uploadedAt || record.uploaded_at || ''

  return {
    id: String(record.id || record.proof_record_id || `${seasonName || index}-${projectName || index}-${uploadedAt || index}`),
    seasonName,
    taskName: projectName,
    fileName: record.imageName || record.image_name || getProofFileName(record),
    imageUrl: String(record.imageUrl || record.image_url || '').trim(),
    note: reviewComment || record.note || '',
    result: normalizePastSeasonResult(record),
    accent: record.accent || HISTORY_ACCENTS[index % HISTORY_ACCENTS.length],
    proofDate: record.proofDate || record.proof_date || '',
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
 * 后端自行排除当前激活赛季，前端不传 season_id；createdAt 表示凭证上传时间，不表示审核时间。
 */
export async function getPastSeasonProofHistory() {
  const response = await request.get('/proof/history')
  const records = Array.isArray(response) ? response : response.records

  return (records || []).map(normalizePastSeasonRecord)
}

/**
 * 获取历史接口下发的单条凭证原图。
 *
 * imageUrl 已由记录接口按登录用户及有效状态授权，必须以 Blob 请求以携带
 * Authorization；不能直接交给 img 标签请求。
 */
export async function getProofRecordImage(imageUrl) {
  if (!imageUrl) {
    throw new Error('凭证图片地址不存在')
  }

  const imageBlob = await request.get(toApiRelativePath(imageUrl), {
    responseType: 'blob'
  })

  if (!imageBlob?.size) {
    throw new Error('凭证图片内容为空')
  }

  return imageBlob
}
