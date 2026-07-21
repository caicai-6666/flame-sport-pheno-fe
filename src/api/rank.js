import request from './request'

function toLeaderboardList(response) {
  if (Array.isArray(response)) {
    return response
  }

  if (Array.isArray(response?.records)) {
    return response.records
  }

  if (Array.isArray(response?.leaderboard)) {
    return response.leaderboard
  }

  if (Array.isArray(response?.list)) {
    return response.list
  }

  if (Array.isArray(response?.data)) {
    return response.data
  }

  if (response && typeof response === 'object' && response.name) {
    return [response]
  }

  return []
}

function normalizeLeaderboardRecord(record, index) {
  const checkinCount = Number(record.checkin_count ?? record.checkinCount ?? 0)

  return {
    id: String(record.id || record.user_id || record.userId || `${record.name || 'user'}-${index}`),
    name: record.name || record.user_name || record.userName || '未命名用户',
    departmentName: record.department_name || record.departmentName || '未设置部门',
    projectRuleLevelId: String(record.project_rule_level_id || record.projectRuleLevelId || ''),
    checkinCount: Number.isNaN(checkinCount) ? 0 : checkinCount,
    isCurrentUser: Boolean(record.is_current_user ?? record.isCurrentUser)
  }
}

/**
 * 获取当前赛季排行榜。
 *
 * 后端接口路径当前为 /leaderboard/info，前端按返回的 checkin_count 计算排名。
 */
export async function getLeaderboardInfo() {
  const response = await request.get('/leaderboard/info')

  return toLeaderboardList(response)
    .map(normalizeLeaderboardRecord)
    .sort((a, b) => b.checkinCount - a.checkinCount)
}
