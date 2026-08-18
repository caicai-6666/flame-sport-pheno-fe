<template>
  <PastSeasonReviewPage
    :records="records"
    :supplement-records="supplementRecords"
    :is-supplement-records-loading="isSupplementRecordsLoading"
    :supplement-records-error="supplementRecordsError"
    :project-tasks="projectTasks"
    :is-season-write-frozen="seasonWriteAvailability.isFrozen"
    @supplement-submitted="handleSupplementSubmitted"
  />
</template>

<script>
import { getPastSeasonProofHistory, getSupplementRecords } from '../api/history'
import { getProjects } from '../api/projects'
import { getCurrentSeason, isNoActiveSeasonError } from '../api/season'
import PastSeasonReviewPage from '../components/PastSeasonReviewPage.vue'
import { appState, setCurrentSeason, setPastSeasonReviewRecords, setProjectTasks, setSeasonAvailability } from '../state/appState'
import { getSeasonWriteAvailability, getSeasonWriteUpdateDelay } from '../utils/seasonWriteAvailability'

export default {
  name: 'PastSeasonReviewView',
  components: {
    PastSeasonReviewPage
  },
  data() {
    return {
      supplementRecords: [],
      isSupplementRecordsLoading: false,
      supplementRecordsError: '',
      seasonWriteAvailability: getSeasonWriteAvailability(null),
      seasonWriteTimer: null
    }
  },
  created() {
    Promise.all([
      this.loadPastSeasonProofHistory(),
      this.loadSupplementRecords(),
      this.loadProjectTasks(),
      this.loadSeasonContext()
    ])
  },
  activated() {
    this.updateSeasonWriteAvailability()
  },
  deactivated() {
    this.clearSeasonWriteTimer()
  },
  beforeUnmount() {
    this.clearSeasonWriteTimer()
  },
  computed: {
    records() {
      return appState.pastSeasonReviewRecords
    },
    projectTasks() {
      return appState.projectTasks
    }
  },
  methods: {
    async loadProjectTasks() {
      if (appState.projectTasks.length) {
        return
      }

      try {
        setProjectTasks(await getProjects())
      } catch {
        setProjectTasks([])
      }
    },
    async loadSeasonContext() {
      if (appState.currentSeason?.seasonId) {
        this.updateSeasonWriteAvailability()
        return
      }

      try {
        const season = await getCurrentSeason()
        setCurrentSeason(season)
        setSeasonAvailability('active')
      } catch (error) {
        setCurrentSeason(null)
        setSeasonAvailability(isNoActiveSeasonError(error) ? 'unavailable' : 'error')
      } finally {
        this.updateSeasonWriteAvailability()
      }
    },
    async loadPastSeasonProofHistory() {
      try {
        const records = await getPastSeasonProofHistory()
        setPastSeasonReviewRecords(records)
      } catch {
        setPastSeasonReviewRecords([])
      }
    },
    async loadSupplementRecords() {
      this.isSupplementRecordsLoading = true
      this.supplementRecordsError = ''

      try {
        this.supplementRecords = await getSupplementRecords()
      } catch {
        this.supplementRecords = []
        this.supplementRecordsError = '可补传记录加载失败'
      } finally {
        this.isSupplementRecordsLoading = false
      }
    },
    updateSeasonWriteAvailability() {
      this.seasonWriteAvailability = getSeasonWriteAvailability(appState.currentSeason)
      this.clearSeasonWriteTimer()

      if (!this.seasonWriteAvailability.nextChangeAt) {
        return
      }

      const delay = getSeasonWriteUpdateDelay(this.seasonWriteAvailability.nextChangeAt)
      this.seasonWriteTimer = window.setTimeout(() => {
        this.seasonWriteTimer = null
        this.updateSeasonWriteAvailability()
      }, delay)
    },
    clearSeasonWriteTimer() {
      if (this.seasonWriteTimer) {
        window.clearTimeout(this.seasonWriteTimer)
        this.seasonWriteTimer = null
      }
    },
    async handleSupplementSubmitted() {
      await Promise.all([
        this.loadPastSeasonProofHistory(),
        this.loadSupplementRecords()
      ])
    }
  }
}
</script>
