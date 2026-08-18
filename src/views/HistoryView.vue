<template>
  <HistoryPage
    :records="records"
    :past-season-review-records="pastSeasonReviewRecords"
    :supplement-records="supplementRecords"
    :is-supplement-records-loading="isSupplementRecordsLoading"
    :supplement-records-error="supplementRecordsError"
    :project-progress-records="projectProgressRecords"
    :project-tasks="projectTasks"
    :is-project-progress-loading="isProjectProgressLoading"
    :project-progress-error="projectProgressError"
    :selected-challenge-level="selectedChallengeLevel"
    :season-participation-status="seasonParticipationStatus"
    :is-no-active-season="isNoActiveSeason"
    :is-season-write-frozen="seasonWriteAvailability.isFrozen"
    @supplement-submitted="handleSupplementSubmitted"
  />
</template>

<script>
import { getCurrentSeasonUploadRecords, getPastSeasonProofHistory, getSupplementRecords } from '../api/history'
import { getProjectProgress, getProjects } from '../api/projects'
import { getCurrentSeason, getSeasonParticipationStatus, isNoActiveSeasonError } from '../api/season'
import HistoryPage from '../components/HistoryPage.vue'
import { appState, setCurrentSeason, setPastSeasonReviewRecords, setProjectTasks, setSeasonAvailability, setSeasonParticipationStatus, setUploadRecords } from '../state/appState'
import { getSeasonWriteAvailability, getSeasonWriteUpdateDelay } from '../utils/seasonWriteAvailability'

export default {
  name: 'HistoryView',
  components: {
    HistoryPage
  },
  data() {
    return {
      projectProgressRecords: [],
      isProjectProgressLoading: false,
      projectProgressError: '',
      supplementRecords: [],
      isSupplementRecordsLoading: false,
      supplementRecordsError: '',
      seasonWriteAvailability: getSeasonWriteAvailability(null),
      seasonWriteTimer: null
    }
  },
  created() {
    this.loadHistoryData()
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
      return appState.uploadRecords
    },
    pastSeasonReviewRecords() {
      return appState.pastSeasonReviewRecords
    },
    projectTasks() {
      return appState.projectTasks
    },
    selectedChallengeLevel() {
      return appState.selectedChallengeLevel
    },
    seasonParticipationStatus() {
      return appState.seasonParticipationStatus
    },
    isNoActiveSeason() {
      return appState.seasonAvailability === 'unavailable'
    }
  },
  methods: {
    async ensureCurrentSeason() {
      if (appState.currentSeason?.seasonId) {
        this.updateSeasonWriteAvailability()
        return appState.currentSeason
      }

      setSeasonAvailability('loading')

      try {
        const season = await getCurrentSeason()
        setCurrentSeason(season)
        setSeasonAvailability('active')
        this.updateSeasonWriteAvailability()

        return season
      } catch (error) {
        setCurrentSeason(null)
        setSeasonAvailability(isNoActiveSeasonError(error) ? 'unavailable' : 'error')
        this.updateSeasonWriteAvailability()
        throw error
      }
    },
    async ensureSeasonParticipationStatus(seasonId) {
      if (appState.seasonParticipationStatus !== 'unknown') {
        return appState.seasonParticipationStatus
      }

      const participation = await getSeasonParticipationStatus(seasonId)
      setSeasonParticipationStatus(participation)

      return participation.status
    },
    async ensureProjectTasks() {
      if (appState.projectTasks.length) {
        return appState.projectTasks
      }

      const projectTasks = await getProjects()
      setProjectTasks(projectTasks)

      return projectTasks
    },
    async loadCurrentSeasonData(seasonId) {
      this.isProjectProgressLoading = true
      this.projectProgressError = ''

      const [, uploadRecordsResult, projectProgressResult] = await Promise.allSettled([
        this.ensureProjectTasks(),
        getCurrentSeasonUploadRecords(),
        getProjectProgress(seasonId)
      ])

      if (uploadRecordsResult.status === 'fulfilled') {
        setUploadRecords(uploadRecordsResult.value)
      } else {
        setUploadRecords([])
      }

      if (projectProgressResult.status === 'fulfilled') {
        this.projectProgressRecords = projectProgressResult.value
      } else {
        this.projectProgressRecords = []
        this.projectProgressError = '项目进度加载失败，请稍后重试'
      }

      this.isProjectProgressLoading = false
    },
    async loadHistoryData() {
      try {
        await Promise.all([
          this.loadPastSeasonProofHistory(),
          this.loadSupplementRecords(),
          // 未参与当前赛季时也能进入补传流程，因此项目 ID 映射必须提前准备。
          this.ensureProjectTasks().catch(() => [])
        ])
        const season = await this.ensureCurrentSeason()
        const participationStatus = await this.ensureSeasonParticipationStatus(season.seasonId)

        if (participationStatus !== 'participated') {
          setUploadRecords([])
          this.projectProgressRecords = []
          this.projectProgressError = ''
          this.isProjectProgressLoading = false
          return
        }

        await this.loadCurrentSeasonData(season.seasonId)
      } catch (error) {
        setUploadRecords([])
        this.projectProgressRecords = []
        this.projectProgressError = isNoActiveSeasonError(error) ? '' : '项目进度加载失败，请稍后重试'
        this.isProjectProgressLoading = false
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
      // 补传会原位更新凭证并消费资格，两份列表必须一起刷新以免留下重复卡片。
      await Promise.all([
        this.loadPastSeasonProofHistory(),
        this.loadSupplementRecords()
      ])
    }
  }
}
</script>
