<template>
  <PastSeasonReviewPage :records="records" />
</template>

<script>
import { getPastSeasonProofHistory } from '../api/history'
import PastSeasonReviewPage from '../components/PastSeasonReviewPage.vue'
import { appState, setPastSeasonReviewRecords } from '../state/appState'

export default {
  name: 'PastSeasonReviewView',
  components: {
    PastSeasonReviewPage
  },
  created() {
    this.loadPastSeasonProofHistory()
  },
  computed: {
    records() {
      return appState.pastSeasonReviewRecords
    }
  },
  methods: {
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
