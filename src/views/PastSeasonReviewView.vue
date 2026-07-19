<template>
  <PastSeasonReviewPage :records="records" />
</template>

<script>
import PastSeasonReviewPage from '../components/PastSeasonReviewPage.vue'
import { appState } from '../state/appState'

export default {
  name: 'PastSeasonReviewView',
  components: {
    PastSeasonReviewPage
  },
  computed: {
    records() {
      return appState.pastSeasonReviewRecords
    }
  }
}
</script>
