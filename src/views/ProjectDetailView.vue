<template>
  <ProjectDetail
    v-if="task"
    :task="task"
    :is-locked="isLocked"
    :remaining-lock-slots="remainingLockSlots"
    :selected-challenge-level="selectedChallengeLevel"
    :challenges="challenges"
    :is-challenge-loading="isChallengeLoading"
    :is-locking="isLocking"
    :lock-error="lockError"
    :is-registration-closed="isSeasonRegistrationClosed"
    :is-no-active-season="isNoActiveSeason"
    :is-season-context-loading="isSeasonContextLoading"
    :is-season-write-frozen="seasonWriteAvailability.isFrozen"
    :season-write-message="seasonWriteAvailability.message"
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
import { getCurrentSeason, getSeasonParticipationStatus, isNoActiveSeasonError } from '../api/season'
import ProjectDetail from '../components/ProjectDetail.vue'
import { appState, findTaskByName, isTaskLocked, lockTask as markTaskLocked, remainingLockSlots, setCurrentSeason, setProjectTasks, setSeasonAvailability, setSeasonParticipationStatus } from '../state/appState'
import { getSeasonWriteAvailability, getSeasonWriteUpdateDelay } from '../utils/seasonWriteAvailability'

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
      isChallengeLoading: true,
      isLocking: false,
      lockError: null,
      isSeasonContextLoading: true,
      seasonWriteAvailability: getSeasonWriteAvailability(null),
      seasonWriteTimer: null
    }
  },
  async created() {
    await this.ensureProjectTasks()
    this.loadProjectLevels()
    this.loadSeasonContext()
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
      return appState.currentSeason?.seasonId || ''
    },
    isSeasonRegistrationClosed() {
      return appState.seasonParticipationStatus === 'closed'
    },
    isNoActiveSeason() {
      return appState.seasonAvailability === 'unavailable'
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
        this.isChallengeLoading = false
        return
      }

      this.isChallengeLoading = true

      try {
        this.challenges = await getProjectLevels(projectId)
      } catch {
        this.challenges = []
      } finally {
        this.isChallengeLoading = false
      }
    },
    async loadSeasonContext() {
      this.isSeasonContextLoading = true
      setSeasonAvailability('loading')

      try {
        // 详情页不能信任路由中遗留的 seasonId，必须以当前赛季接口的结果决定能否锁定。
        const season = await getCurrentSeason()
        setCurrentSeason(season)
        setSeasonAvailability('active')
        this.updateSeasonWriteAvailability()
      } catch (error) {
        this.seasonWriteAvailability = getSeasonWriteAvailability(null)
        this.clearSeasonWriteTimer()
        if (isNoActiveSeasonError(error)) {
          setCurrentSeason(null)
          setSeasonAvailability('unavailable')
          setSeasonParticipationStatus({ status: 'unknown' })
          this.isSeasonContextLoading = false
          return
        }

        setSeasonAvailability('error')
        setSeasonParticipationStatus({ status: 'unknown' })
        this.isSeasonContextLoading = false
        return
      }

      try {
        const participation = await getSeasonParticipationStatus(this.seasonId)
        setSeasonParticipationStatus(participation)
      } catch {
        // 参与状态检查失败不影响规则浏览；锁定接口仍由后端执行最终校验。
        setSeasonParticipationStatus({ status: 'unknown' })
      } finally {
        this.isSeasonContextLoading = false
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
    async lockTask(task) {
      if (this.isLocking || this.isLocked || this.isSeasonRegistrationClosed || this.isNoActiveSeason || this.isSeasonContextLoading || this.seasonWriteAvailability.isFrozen) {
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
        const seasonId = this.seasonId

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
