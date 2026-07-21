import request from './request'

const PROJECT_ACCENTS = [
  '#68d65c',
  '#ff9f45',
  '#7b8cff',
  '#20c7b5',
  '#3fb06d',
  '#ff6f91',
  '#4f9cff',
  '#b46cff',
  '#f2c94c',
  '#2ec4b6',
  '#ff7a59',
  '#6fcf97',
  '#56ccf2',
  '#bb6bd9',
  '#f2994a',
  '#27ae60',
  '#eb5757',
  '#2d9cdb',
  '#9b51e0',
  '#219653'
]

const CHALLENGE_META_MAP = {
  青铜: {
    medal: '🥉',
    tone: 'bronze'
  },
  白银: {
    medal: '🥈',
    tone: 'silver'
  },
  黄金: {
    medal: '🥇',
    tone: 'gold'
  }
}

const projectLevelCache = new Map()
const projectLevelRequestCache = new Map()
const uploadConfigCache = new Map()
const uploadConfigRequestCache = new Map()

function toImageSource(project) {
  const image = project.image || project.image_data || project.icon || ''

  if (!image) {
    return ''
  }

  if (image.startsWith('data:')) {
    return image
  }

  const contentType = project.image_content_type || project.imageContentType || 'image/png'
  return `data:${contentType};base64,${image}`
}

function normalizeProject(project, index) {
  return {
    projectId: project.project_id || project.id,
    name: project.name,
    description: project.description,
    icon: toImageSource(project),
    accent: PROJECT_ACCENTS[index % PROJECT_ACCENTS.length]
  }
}

function normalizeRuleContent(ruleContent) {
  if (Array.isArray(ruleContent)) {
    return ruleContent
  }

  if (!ruleContent) {
    return []
  }

  try {
    return JSON.parse(ruleContent)
  } catch (error) {
    return []
  }
}

function normalizeChallengeLevel(challenge) {
  const challengeName = challenge.name || challenge.level_name || challenge.challenge_name
  const level = challengeName.replace(/挑战$/, '')
  const challengeMeta = CHALLENGE_META_MAP[level] || {}
  const metrics = normalizeRuleContent(challenge.rule_content || challenge.metrics)
  const reward = Number(challenge.reward)

  return {
    projectRuleLevelId: String(challenge.project_rule_level_id || challenge.project_rule_id || challenge.rule_id || challenge.id || ''),
    name: challengeName,
    reward: Number.isNaN(reward) ? null : reward,
    level,
    medal: challenge.medal || challengeMeta.medal || '',
    tone: challenge.tone || challengeMeta.tone || '',
    subtitle: challenge.sub_desc || challenge.subtitle || '',
    metrics: metrics.map(metric => ({
      label: metric.label,
      value: metric.value
    })),
    note: challenge.rule_note || challenge.note || ''
  }
}

function getChallengeRewardSortValue(challenge) {
  return typeof challenge.reward === 'number' ? challenge.reward : Number.POSITIVE_INFINITY
}

function normalizeUploadConfig(config) {
  return {
    uploadConfigId: String(config.uploadConfigId || config.upload_config_id || config.id || ''),
    recordType: config.recordType || config.record_type || '',
    uploadHint: config.uploadHint || config.upload_hint || '',
    noteExample: config.noteExample || config.note_example || ''
  }
}

function normalizeProofUploadResult(response) {
  return {
    createdAt: response?.created_at || response?.createdAt || ''
  }
}

/**
 * 获取当前赛季可选项目。
 *
 * 后端返回项目名称、描述和图片数据。图片不是 URL，
 * 当前前端按 base64 图片字符串或 data URL 进行适配。
 */
export async function getProjects() {
  const response = await request.get('/project/list')
  const projects = Array.isArray(response) ? response : response.projects

  return (projects || []).map(normalizeProject)
}

function normalizeLockedProject(project) {
  if (typeof project === 'string' || typeof project === 'number') {
    return {
      projectId: String(project),
      name: ''
    }
  }

  return {
    projectId: String(project.project_id || project.id || ''),
    name: project.name || project.project_name || ''
  }
}

/**
 * 获取当前赛季已锁定项目。
 *
 * 根据赛季 ID 查询用户在该赛季已经锁定的项目，
 * 用于首页项目卡片高亮和详情页锁定状态展示。
 */
export async function getLockedProjects(seasonId) {
  const response = await request.get('/project/lock_check', {
    params: {
      season_id: seasonId
    }
  })
  const lockedProjects = Array.isArray(response) ? response : response.locked_projects
  const normalizedLockedProjects = (lockedProjects || []).map(normalizeLockedProject)

  return normalizedLockedProjects
}

/**
 * 锁定当前赛季的指定项目。
 *
 * 后端只需要根据 season_id 和 project_id 建立锁定关系。
 * 请求成功以 HTTP 2xx 状态码为准，返回体当前不做强依赖。
 */
export async function lockProject(seasonId, projectId) {
  return request.post('/project/lock', {
    season_id: seasonId,
    project_id: projectId
  })
}

/**
 * 锁定当前赛季的统一挑战等级。
 *
 * 后端根据 auth_code 找到当前用户，再把 project_rule_level_id 写入指定赛季用户记录。
 * 请求成功以 HTTP 2xx 状态码为准，返回体当前不做强依赖。
 */
export async function lockProjectLevel(seasonId, projectRuleLevelId) {
  return request.post('/project/lock_level', {
    season_id: seasonId,
    project_rule_level_id: projectRuleLevelId
  })
}

/**
 * 获取项目挑战等级规则。
 *
 * 根据项目 ID 向后端请求挑战规则。后端返回的指标为 JSON 数组，
 * 每个指标项使用 label-value 描述一条约束。
 */
export async function getProjectLevels(projectId) {
  const cacheKey = String(projectId || '')

  if (cacheKey && projectLevelCache.has(cacheKey)) {
    return projectLevelCache.get(cacheKey)
  }

  if (cacheKey && projectLevelRequestCache.has(cacheKey)) {
    return projectLevelRequestCache.get(cacheKey)
  }

  const levelsRequest = request.get('/project/rules', {
    params: {
      project_id: projectId
    }
  }).then(response => {
    const levels = Array.isArray(response) ? response : response.levels
    const normalizedLevels = (levels || [])
      .map(normalizeChallengeLevel)
      .sort((current, next) => getChallengeRewardSortValue(current) - getChallengeRewardSortValue(next))

    if (cacheKey) {
      projectLevelCache.set(cacheKey, normalizedLevels)
      projectLevelRequestCache.delete(cacheKey)
    }

    return normalizedLevels
  }).catch(error => {
    if (cacheKey) {
      projectLevelRequestCache.delete(cacheKey)
    }

    throw error
  })

  if (cacheKey) {
    projectLevelRequestCache.set(cacheKey, levelsRequest)
  }

  return levelsRequest
}

/**
 * 获取项目上传凭证配置。
 *
 * 根据项目 ID 查询该项目需要上传的凭证类型、上传提示和备注示例。
 * 如果后端只返回一个配置，前端会直接使用该配置，不再展示记录类型选项。
 */
export async function getProjectUploadConfig(projectId) {
  const cacheKey = String(projectId || '')

  if (cacheKey && uploadConfigCache.has(cacheKey)) {
    return uploadConfigCache.get(cacheKey)
  }

  if (cacheKey && uploadConfigRequestCache.has(cacheKey)) {
    return uploadConfigRequestCache.get(cacheKey)
  }

  const uploadConfigRequest = request.get('/proof/config', {
    params: {
      project_id: projectId
    }
  }).then(response => {
    const uploadConfigs = Array.isArray(response) ? response : response.uploadConfigs
    const normalizedUploadConfigs = (uploadConfigs || []).map(normalizeUploadConfig)

    if (cacheKey) {
      uploadConfigCache.set(cacheKey, normalizedUploadConfigs)
      uploadConfigRequestCache.delete(cacheKey)
    }

    return normalizedUploadConfigs
  }).catch(error => {
    if (cacheKey) {
      uploadConfigRequestCache.delete(cacheKey)
    }

    throw error
  })

  if (cacheKey) {
    uploadConfigRequestCache.set(cacheKey, uploadConfigRequest)
  }

  return uploadConfigRequest
}

/**
 * 上传项目凭证。
 *
 * 前端会在提交前把用户选择的图片统一转换为 jpg 并压缩到 1MB 以内，
 * 再通过 multipart/form-data 提交赛季 ID、项目 ID、上传配置 ID、备注和图片文件。
 */
export async function uploadProjectProof({ seasonId, projectId, projectUploadConfigId, note, imageFile }) {
  const formData = new FormData()

  formData.append('season_id', seasonId)
  formData.append('project_id', projectId)
  formData.append('project_upload_config_id', projectUploadConfigId)
  formData.append('note', note || '')
  formData.append('image', imageFile, imageFile.name)

  const response = await request.post('/proof/upload', formData)

  return normalizeProofUploadResult(response)
}
