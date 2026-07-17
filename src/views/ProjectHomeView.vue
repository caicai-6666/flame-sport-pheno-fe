<template>
  <ProjectHome
    :tasks="tasks"
    :locked-task-names="lockedTaskNames"
    :max-locked-tasks="maxLockedTasks"
    :selected-challenge-level="selectedChallengeLevel"
    @select-task="openTask"
    @select-level="selectChallengeLevel"
    @submit-proof="addUploadRecord"
  />
</template>

<script>
import ProjectHome from '../components/ProjectHome.vue'
import { addUploadRecord, appState, tasks } from '../state/appState'

export default {
  name: 'ProjectHomeView',
  components: {
    ProjectHome
  },
  computed: {
    tasks() {
      return tasks
    },
    lockedTaskNames() {
      return appState.lockedTaskNames
    },
    maxLockedTasks() {
      return appState.maxLockedTasks
    },
    selectedChallengeLevel() {
      return appState.selectedChallengeLevel
    }
  },
  methods: {
    openTask(task) {
      this.$router.push({
        name: 'project-detail',
        params: { taskName: task.name }
      })
    },
    selectChallengeLevel(level) {
      appState.selectedChallengeLevel = level
    },
    addUploadRecord
  }
}
</script>
