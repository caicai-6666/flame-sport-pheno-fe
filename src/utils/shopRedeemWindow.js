const DEFAULT_SHOP_REDEEM_WINDOW_DAYS = 7

function parseLocalDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (!match) {
    return null
  }

  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))

  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null
  }

  return date
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date, days) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + days)
  return nextDate
}

function formatMonthDay(date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export function getShopRedeemWindowDays() {
  const configuredDays = Number(process.env.VUE_APP_SHOP_REDEEM_WINDOW_DAYS)

  return Number.isInteger(configuredDays) && configuredDays > 0
    ? configuredDays
    : DEFAULT_SHOP_REDEEM_WINDOW_DAYS
}

/**
 * 商城只在赛季开始后的前 N 个自然日开放兑换。日期使用本地零点比较，避免 YYYY-MM-DD 被按 UTC 解析后提前或延后一天。
 */
export function getShopRedeemAvailability(season, now = new Date()) {
  const seasonStartDate = parseLocalDate(season?.startDate)
  const seasonEndDate = parseLocalDate(season?.endDate)

  if (!seasonStartDate || !seasonEndDate || seasonEndDate < seasonStartDate) {
    return {
      isAvailable: false,
      message: '暂无法确认赛季兑换时间',
      nextChangeAt: null
    }
  }

  const windowDays = getShopRedeemWindowDays()
  const seasonEndExclusive = addDays(seasonEndDate, 1)
  const redeemEndExclusive = new Date(Math.min(addDays(seasonStartDate, windowDays), seasonEndExclusive))
  const today = startOfDay(now)

  if (today < seasonStartDate) {
    return {
      isAvailable: false,
      message: `兑换将于${formatMonthDay(seasonStartDate)}开放`,
      nextChangeAt: seasonStartDate.getTime()
    }
  }

  if (today >= redeemEndExclusive) {
    return {
      isAvailable: false,
      message: `本赛季兑换期已结束（仅赛季前${windowDays}天开放）`,
      nextChangeAt: null
    }
  }

  return {
    isAvailable: true,
    message: `本赛季前${windowDays}天可兑换，截止${formatMonthDay(addDays(redeemEndExclusive, -1))}`,
    nextChangeAt: redeemEndExclusive.getTime()
  }
}
