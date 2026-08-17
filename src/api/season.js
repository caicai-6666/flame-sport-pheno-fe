import request from './request'

// /season/current 的 404 是产品约定的“暂无激活赛季”，不能与其他接口的 404 混为一谈。
export function isNoActiveSeasonError(error) {
  return error?.status === 404
}

function normalizeSeason(season) {
  return {
    seasonId: season.season_id || season.id,
    name: season.name || season.season_name || '',
    startDate: season.start_date || season.startDate || '',
    endDate: season.end_date || season.endDate || '',
    requiredProjectCount: Number(season.required_project_count || season.requiredProjectCount || 3),
    serverTime: season.server_time || season.serverTime || '',
    userWriteFrozen: Boolean(season.user_write_frozen ?? season.userWriteFrozen),
    userWriteFreezeStartsAt: season.user_write_freeze_starts_at || season.userWriteFreezeStartsAt || '',
    userWriteAvailableAt: season.user_write_available_at || season.userWriteAvailableAt || '',
    // 记录响应抵达时间，后续用服务端时间轴推算保护期边界，不直接信任设备绝对时钟。
    receivedAt: Date.now()
  }
}

function normalizeLevelName(level) {
  if (!level) {
    return ''
  }

  if (typeof level === 'string') {
    return level
  }

  return level.name || level.level || level.level_name || level.challenge_level || ''
}

function normalizeParticipation(response) {
  const participation = response.participation || response.season_user || response

  if (typeof participation === 'string') {
    return {
      status: 'participated',
      level: participation,
      projectRuleLevelId: ''
    }
  }

  const level = participation.level || participation.level_name || participation.challenge_level || participation.challenge_level_name || participation.name || participation.challengeLevel

  return {
    status: 'participated',
    level: normalizeLevelName(level),
    projectRuleLevelId: String(participation.project_rule_level_id || level?.id || '')
  }
}

/**
 * 获取当前进行中的赛季信息。
 *
 * 用于 ProjectHome 顶部 hero-card 展示赛季名称和赛季持续时间。
 */
export async function getCurrentSeason() {
  const response = await request.get('/season/current')
  const season = response.season || response

  return normalizeSeason(season)
}

/**
 * 检查当前用户在指定赛季中的参与状态。
 *
 * 200：已经完成报名，返回已选择的挑战等级。
 * 409：仍在报名时间内，但尚未完成报名。
 * 403：已经超过报名时间，不能继续报名。
 */
export async function getSeasonParticipationStatus(seasonId) {
  try {
    const response = await request.get('/season/participate_check', {
      params: {
        season_id: seasonId
      }
    })
    const participation = normalizeParticipation(response)

    return participation
  } catch (error) {
    if (error.status === 409) {
      return {
        status: 'registering',
        level: '',
        projectRuleLevelId: ''
      }
    }

    if (error.status === 403) {
      return {
        status: 'closed',
        level: '',
        projectRuleLevelId: ''
      }
    }

    throw error
  }
}
