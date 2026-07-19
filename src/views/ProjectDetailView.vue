<template>
  <ProjectDetail
    v-if="task"
    :task="task"
    :is-locked="isLocked"
    :remaining-lock-slots="remainingLockSlots"
    :selected-challenge-level="selectedChallengeLevel"
    :challenges="challenges"
    :is-locking="isLocking"
    :lock-error="lockError"
    :is-registration-closed="isSeasonRegistrationClosed"
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
import { getProjectLevels, getProjects, lockProject } from '../api/projects'
import { getCurrentSeason, getSeasonParticipationStatus } from '../api/season'
import ProjectDetail from '../components/ProjectDetail.vue'
import { appState, findTaskByName, isTaskLocked, lockTask as markTaskLocked, remainingLockSlots, setCurrentSeason, setProjectTasks, setSeasonParticipationStatus } from '../state/appState'

const MIN_LOCKING_DURATION = 900

function wait(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

async function waitForMinLockingDuration(startedAt) {
  const elapsed = Date.now() - startedAt
  const remaining = MIN_LOCKING_DURATION - elapsed

  if (remaining > 0) {
    await wait(remaining)
  }
}

export default {
  name: 'ProjectDetailView',
  components: {
    ProjectDetail
  },
  data() {
    return {
      challenges: [],
      isLocking: false,
      lockError: null
    }
  },
  async created() {
    await this.ensureProjectTasks()
    this.loadProjectLevels()
    this.loadSeasonParticipationStatus()
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
    },
    projectId() {
      return this.$route.query.projectId || this.task?.projectId || ''
    },
    seasonId() {
      return this.$route.query.seasonId || appState.currentSeason?.seasonId || ''
    },
    isSeasonRegistrationClosed() {
      return appState.seasonParticipationStatus === 'closed'
    }
  },
  methods: {
    async ensureProjectTasks() {
      if (this.task || appState.projectTasks.length) {
        return
      }

      try {
        const projects = await getProjects()
        setProjectTasks(projects)
      } catch {
        setProjectTasks([])
      }
    },
    async loadProjectLevels() {
      const projectId = this.projectId

      if (!projectId) {
        this.challenges = []
        return
      }

      try {
        this.challenges = await getProjectLevels(projectId)
      } catch {
        this.challenges = []
      }
    },
    async ensureSeasonId() {
      if (this.seasonId) {
        return this.seasonId
      }

      const season = await getCurrentSeason()
      setCurrentSeason(season)

      return season.seasonId
    },
    async loadSeasonParticipationStatus() {
      if (appState.seasonParticipationStatus !== 'unknown') {
        return
      }

      try {
        const seasonId = await this.ensureSeasonId()

        if (!seasonId) {
          return
        }

        const participation = await getSeasonParticipationStatus(seasonId)
        setSeasonParticipationStatus(participation)
      } catch {
        // 参与状态检查失败不阻断详情规则展示，锁定时仍以后端接口结果为准。
      }
    },
    async lockTask(task) {
      if (this.isLocking || this.isLocked || this.isSeasonRegistrationClosed) {
        return
      }

      const projectId = this.projectId

      if (!projectId) {
        this.lockError = new Error('缺少 project_id，无法锁定项目')
        return
      }

      this.isLocking = true
      this.lockError = null
      const lockStartedAt = Date.now()

      try {
        const seasonId = await this.ensureSeasonId()

        if (!seasonId) {
          throw new Error('缺少 season_id，无法锁定项目')
        }

        await lockProject(seasonId, projectId)
        await waitForMinLockingDuration(lockStartedAt)
        markTaskLocked({
          ...task,
          projectId
        })
        this.lockError = null
      } catch (error) {
        await waitForMinLockingDuration(lockStartedAt)
        this.lockError = error
      } finally {
        this.isLocking = false
      }
    }
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
