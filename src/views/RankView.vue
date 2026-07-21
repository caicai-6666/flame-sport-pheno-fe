<template>
  <RankPage
    :leaderboard-records="leaderboardRecords"
    :is-loading="isLoading"
    :error-message="errorMessage"
    @retry="loadLeaderboard"
  />
</template>

<script>
import RankPage from '../components/RankPage.vue'
import { getLeaderboardInfo } from '../api/rank'
import { appState, setLeaderboardRecords } from '../state/appState'

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
      errorMessage: ''
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
      const loadingStartedAt = Date.now()

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
