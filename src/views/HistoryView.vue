<template>
  <HistoryPage
    :records="records"
    :past-season-review-records="pastSeasonReviewRecords"
    :project-progress-records="projectProgressRecords"
    :project-tasks="projectTasks"
    :is-project-progress-loading="isProjectProgressLoading"
    :project-progress-error="projectProgressError"
    :selected-challenge-level="selectedChallengeLevel"
    :season-participation-status="seasonParticipationStatus"
  />
</template>

<script>
import { getCurrentSeasonUploadRecords, getPastSeasonProofHistory } from '../api/history'
import { getProjectProgress, getProjects } from '../api/projects'
import { getCurrentSeason, getSeasonParticipationStatus } from '../api/season'
import HistoryPage from '../components/HistoryPage.vue'
import { appState, setCurrentSeason, setPastSeasonReviewRecords, setProjectTasks, setSeasonParticipationStatus, setUploadRecords } from '../state/appState'

export default {
  name: 'HistoryView',
  components: {
    HistoryPage
  },
  data() {
    return {
      projectProgressRecords: [],
      isProjectProgressLoading: false,
      projectProgressError: ''
    }
  },
  created() {
    this.loadHistoryData()
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
    }
  },
  methods: {
    async ensureCurrentSeason() {
      if (appState.currentSeason?.seasonId) {
        return appState.currentSeason
      }

      const season = await getCurrentSeason()
      setCurrentSeason(season)

      return season
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
        await this.loadPastSeasonProofHistory()
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
      } catch {
        setUploadRecords([])
        this.projectProgressRecords = []
        this.projectProgressError = '项目进度加载失败，请稍后重试'
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
    }
  }
}
</script>
