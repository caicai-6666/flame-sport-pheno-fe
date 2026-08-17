const HOUR_IN_MILLISECONDS = 60 * 60 * 1000
const MAX_TIMEOUT_DELAY = 2147483647

function getConfiguredWindowHours() {
  const configuredHours = Number(process.env.VUE_APP_ACTIVE_SEASON_CONFIG_EDIT_WINDOW_HOURS)

  return Number.isInteger(configuredHours) && configuredHours >= 0
    ? configuredHours
    : null
}

function parseTimestamp(value) {
  const timestamp = Date.parse(value || '')

  return Number.isFinite(timestamp) ? timestamp : null
}

function estimateServerTime(season, clientTime) {
  const serverTime = parseTimestamp(season?.serverTime)
  const receivedAt = Number(season?.receivedAt)

  if (serverTime === null || !Number.isFinite(receivedAt)) {
    return clientTime
  }

  // 使用响应携带的服务端时间校准设备时钟，避免手机时间不准导致按钮提前开放。
  return serverTime + Math.max(clientTime - receivedAt, 0)
}

function toClientBoundaryTime(boundaryTime, serverTime, clientTime) {
  return clientTime + Math.max(boundaryTime - serverTime, 0)
}

function getConfiguredWriteWindow(season) {
  const configuredHours = getConfiguredWindowHours()
  const startDate = String(season?.startDate || '')

  if (configuredHours === null || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return null
  }

  // 前端开发配置与后端统一按上海时区的赛季开始日零点计算，便于构造长保护期预览。
  const freezeStartsAt = parseTimestamp(`${startDate}T00:00:00+08:00`)

  if (freezeStartsAt === null) {
    return null
  }

  return {
    freezeStartsAt,
    writeAvailableAt: freezeStartsAt + configuredHours * HOUR_IN_MILLISECONDS
  }
}

export function getSeasonWriteAvailability(season, clientTime = Date.now()) {
  const configuredWindow = getConfiguredWriteWindow(season)
  const freezeStartsAt = configuredWindow?.freezeStartsAt ?? parseTimestamp(season?.userWriteFreezeStartsAt)
  const writeAvailableAt = configuredWindow?.writeAvailableAt ?? parseTimestamp(season?.userWriteAvailableAt)
  const estimatedServerTime = estimateServerTime(season, clientTime)

  if (freezeStartsAt === null || writeAvailableAt === null || writeAvailableAt <= freezeStartsAt) {
    return {
      isFrozen: configuredWindow ? false : Boolean(season?.userWriteFrozen),
      message: !configuredWindow && season?.userWriteFrozen
        ? '本赛季尚未正式开始，报名、上传和兑换暂未开放，项目内容可提前查看。'
        : '',
      remainingHours: null,
      nextChangeAt: null
    }
  }

  if (estimatedServerTime < freezeStartsAt) {
    return {
      isFrozen: false,
      message: '',
      remainingHours: null,
      nextChangeAt: toClientBoundaryTime(freezeStartsAt, estimatedServerTime, clientTime)
    }
  }

  if (estimatedServerTime >= writeAvailableAt) {
    return {
      isFrozen: false,
      message: '',
      remainingHours: null,
      nextChangeAt: null
    }
  }

  const remainingHours = Math.max(
    1,
    Math.ceil((writeAvailableAt - estimatedServerTime) / HOUR_IN_MILLISECONDS)
  )

  return {
    isFrozen: true,
    message: `本赛季将在 ${remainingHours} 小时后正式开始，项目内容可提前查看。`,
    remainingHours,
    nextChangeAt: toClientBoundaryTime(writeAvailableAt, estimatedServerTime, clientTime)
  }
}

export function getSeasonWriteUpdateDelay(nextChangeAt, clientTime = Date.now()) {
  if (!Number.isFinite(nextChangeAt)) {
    return null
  }

  // 浏览器计时器使用 32 位延迟；远期边界分段等待，避免提前激活赛季导致溢出空转。
  return Math.min(Math.max(nextChangeAt - clientTime + 100, 0), MAX_TIMEOUT_DELAY)
}
