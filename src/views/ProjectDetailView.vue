<template>
  <ProjectDetail
    v-if="task"
    :task="task"
    :is-locked="isLocked"
    :remaining-lock-slots="remainingLockSlots"
    :selected-challenge-level="selectedChallengeLevel"
    @lock-task="lockTask"
  />

  <section v-else class="module-page">
    <span class="module-eyebrow">UNKNOWN CHALLENGE</span>
    <h1>未找到运动项目</h1>
    <p>当前链接对应的运动项目不存在，请返回项目列表重新选择。</p>
    <button class="module-action" type="button" @click="$router.push({ name: 'projects' })">
      返回项目列表
    </button>
  </section>
</template>

<script>
import ProjectDetail from '../components/ProjectDetail.vue'
import { appState, findTaskByName, isTaskLocked, lockTask, remainingLockSlots } from '../state/appState'

export default {
  name: 'ProjectDetailView',
  components: {
    ProjectDetail
  },
  computed: {
    task() {
      return findTaskByName(this.$route.params.taskName)
    },
    isLocked() {
      return isTaskLocked(this.task)
    },
    remainingLockSlots() {
      return remainingLockSlots.value
    },
    selectedChallengeLevel() {
      return appState.selectedChallengeLevel
    }
  },
  methods: {
    lockTask
  }
}
</script>

<style scoped>
.module-action {
  margin-top: 20px;
  min-height: 42px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #70dd4d, #39b54a);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 900;
  box-shadow: 0 12px 22px rgba(58, 181, 74, 0.26);
}
</style>
