<template>
  <HistoryPage
    :records="records"
    :past-season-review-records="pastSeasonReviewRecords"
    :locked-task-names="lockedTaskNames"
    :selected-challenge-level="selectedChallengeLevel"
    :season-participation-status="seasonParticipationStatus"
  />
</template>

<script>
import { getCurrentSeasonUploadRecords, getPastSeasonProofHistory } from '../api/history'
import { getCurrentSeason, getSeasonParticipationStatus } from '../api/season'
import HistoryPage from '../components/HistoryPage.vue'
import { appState, setCurrentSeason, setPastSeasonReviewRecords, setSeasonParticipationStatus, setUploadRecords } from '../state/appState'

export default {
  name: 'HistoryView',
  components: {
    HistoryPage
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
    lockedTaskNames() {
      return appState.lockedTaskNames
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
    async loadHistoryData() {
      try {
        await this.loadPastSeasonProofHistory()
        const season = await this.ensureCurrentSeason()
        const participationStatus = await this.ensureSeasonParticipationStatus(season.seasonId)

        if (participationStatus !== 'participated') {
          setUploadRecords([])
          return
        }

        const uploadRecords = await getCurrentSeasonUploadRecords()
        setUploadRecords(uploadRecords)
      } catch {
        setUploadRecords([])
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
