<template>
  <HistoryPage
    :records="records"
    :locked-task-names="lockedTaskNames"
    :selected-challenge-level="selectedChallengeLevel"
  />
</template>

<script>
import HistoryPage from '../components/HistoryPage.vue'
import { appState } from '../state/appState'

export default {
  name: 'HistoryView',
  components: {
    HistoryPage
  },
  computed: {
    records() {
      return appState.uploadRecords
    },
    lockedTaskNames() {
      return appState.lockedTaskNames
    },
    selectedChallengeLevel() {
      return appState.selectedChallengeLevel
    }
  }
}
</script>
