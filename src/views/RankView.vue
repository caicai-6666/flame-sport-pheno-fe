<template>
  <RankPage
    :leaderboard-records="leaderboardRecords"
    :is-loading="isLoading"
    :error-message="errorMessage"
    :is-no-active-season="isNoActiveSeason"
    @retry="loadLeaderboard"
  />
</template>

<script>
import RankPage from '../components/RankPage.vue'
import { getLeaderboardInfo } from '../api/rank'
import { getCurrentSeason, isNoActiveSeasonError } from '../api/season'
import { appState, setCurrentSeason, setLeaderboardRecords, setSeasonAvailability } from '../state/appState'

const MIN_LOADING_DURATION = 1000

function wait(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

async function waitForMinLoadingDuration(startedAt) {
  const elapsed = Date.now() - startedAt
  const remaining = MIN_LOADING_DURATION - elapsed

  if (remaining > 0) {
    await wait(remaining)
  }
}

export default {
  name: 'RankView',
  components: {
    RankPage
  },
  data() {
    return {
      isLoading: false,
      errorMessage: '',
      isNoActiveSeason: false
    }
  },
  computed: {
    leaderboardRecords() {
      return appState.leaderboardRecords
    }
  },
  created() {
    this.loadLeaderboard()
  },
  methods: {
    async loadLeaderboard() {
      this.isLoading = true
      this.errorMessage = ''
      this.isNoActiveSeason = false
      const loadingStartedAt = Date.now()

      setSeasonAvailability('loading')

      try {
        const season = await getCurrentSeason()
        setCurrentSeason(season)
        setSeasonAvailability('active')
      } catch (error) {
        await waitForMinLoadingDuration(loadingStartedAt)

        if (isNoActiveSeasonError(error)) {
          // 无赛季时清空 KeepAlive 留下的旧榜单，避免误把上一赛季结果当作当前排名。
          this.isNoActiveSeason = true
          setCurrentSeason(null)
          setSeasonAvailability('unavailable')
          setLeaderboardRecords([])
          this.isLoading = false
          return
        }

        this.isNoActiveSeason = false
        this.errorMessage = error.message || '排行榜加载失败'
        this.isLoading = false
        return
      }

      try {
        const leaderboardRecords = await getLeaderboardInfo()
        await waitForMinLoadingDuration(loadingStartedAt)
        setLeaderboardRecords(leaderboardRecords)
      } catch (error) {
        await waitForMinLoadingDuration(loadingStartedAt)
        this.errorMessage = error.message || '排行榜加载失败'
      } finally {
        this.isLoading = false
      }
    }
  }
}
</script>
