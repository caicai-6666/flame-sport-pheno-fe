<template>
  <RankPage
    :records="records"
    :selected-challenge-level="selectedChallengeLevel"
  />
</template>

<script>
import RankPage from '../components/RankPage.vue'
import { appState } from '../state/appState'

export default {
  name: 'RankView',
  components: {
    RankPage
  },
  computed: {
    records() {
      return appState.uploadRecords
    },
    selectedChallengeLevel() {
      return appState.selectedChallengeLevel
    }
  }
}
</script>
