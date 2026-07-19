<template>
  <ProjectHome
    :tasks="tasks"
    :locked-task-names="lockedTaskNames"
    :max-locked-tasks="maxLockedTasks"
    :selected-challenge-level="selectedChallengeLevel"
    :season="season"
    :season-id="seasonId"
    :challenge-level-options="challengeLevelOptions"
    :season-participation-status="seasonParticipationStatus"
    :is-season-participation-loading="isSeasonParticipationLoading"
    :is-challenge-level-loading="isChallengeLevelLoading"
    :is-challenge-level-locking="isChallengeLevelLocking"
    :challenge-level-error="challengeLevelError"
    @select-task="openTask"
    @select-level="selectChallengeLevel"
    @submit-proof="addUploadRecord"
  />
</template>

<script>
import { getLockedProjects, getProjectLevels, getProjects, lockProjectLevel } from '../api/projects'
import { getCurrentSeason, getSeasonParticipationStatus } from '../api/season'
import ProjectHome from '../components/ProjectHome.vue'
import { addUploadRecord, appState, setCurrentSeason, setLockedProjects, setMaxLockedTasks, setProjectTasks, setSeasonParticipationStatus, setSelectedChallengeLevel } from '../state/appState'

const SEASON_PARTICIPATION_CHECK_DELAY = 2000
const CHALLENGE_LEVEL_QUERY_DELAY = 2000

function wait(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

export default {
  name: 'ProjectHomeView',
  components: {
    ProjectHome
  },
  data() {
    return {
      projectTasks: [],
      currentSeason: null,
      isSeasonParticipationLoading: true,
      challengeLevelOptions: [],
      isChallengeLevelLoading: false,
      isChallengeLevelLocking: false,
      challengeLevelError: null
    }
  },
  created() {
    this.loadHomeData()
  },
  watch: {
    isSportSelectionComplete(isComplete) {
      if (isComplete) {
        this.loadChallengeLevelOptions()
        return
      }

      this.challengeLevelOptions = []
      this.challengeLevelError = null
    }
  },
  computed: {
    tasks() {
      return this.projectTasks
    },
    lockedTaskNames() {
      return appState.lockedTaskNames
    },
    maxLockedTasks() {
      return appState.maxLockedTasks
    },
    isSportSelectionComplete() {
      return appState.lockedTaskNames.length >= appState.maxLockedTasks
    },
    selectedChallengeLevel() {
      return appState.selectedChallengeLevel
    },
    seasonParticipationStatus() {
      return appState.seasonParticipationStatus
    },
    isSeasonRegistering() {
      return appState.seasonParticipationStatus === 'registering'
    },
    shouldLoadChallengeLevelOptions() {
      return (
        this.isSeasonRegistering ||
        (
          appState.seasonParticipationStatus === 'participated' &&
          Boolean(appState.selectedProjectRuleLevelId) &&
          !appState.selectedChallengeLevel
        )
      )
    },
    shouldDelayChallengeLevelQuery() {
      return (
        appState.seasonParticipationStatus === 'participated' &&
        Boolean(appState.selectedProjectRuleLevelId) &&
        !appState.selectedChallengeLevel
      )
    },
    season() {
      return this.currentSeason
    },
    seasonId() {
      return this.currentSeason?.seasonId || appState.currentSeason?.seasonId || ''
    }
  },
  methods: {
    async loadHomeData() {
      await Promise.all([
        this.loadProjects(),
        this.loadCurrentSeason()
      ])
      await this.loadSeasonParticipationStatus()
      await this.loadLockedProjects()
      await this.loadChallengeLevelOptions()
    },
    async loadProjects() {
      try {
        this.projectTasks = await getProjects()
        setProjectTasks(this.projectTasks)
      } catch {
        this.projectTasks = []
        setProjectTasks([])
      }
    },
    async loadCurrentSeason() {
      try {
        this.currentSeason = await getCurrentSeason()
        setCurrentSeason(this.currentSeason)
        setMaxLockedTasks(this.currentSeason.requiredProjectCount)
      } catch {
        this.currentSeason = null
        setCurrentSeason(null)
      }
    },
    async loadSeasonParticipationStatus() {
      if (!this.currentSeason?.seasonId) {
        setSeasonParticipationStatus({
          status: 'unknown'
        })
        this.isSeasonParticipationLoading = false
        return
      }

      this.isSeasonParticipationLoading = true

      try {
        await wait(SEASON_PARTICIPATION_CHECK_DELAY)
        const participation = await getSeasonParticipationStatus(this.currentSeason.seasonId)
        setSeasonParticipationStatus(participation)
      } catch {
        setSeasonParticipationStatus({
          status: 'unknown'
        })
      } finally {
        this.isSeasonParticipationLoading = false
      }
    },
    async loadLockedProjects() {
      if (!this.currentSeason?.seasonId) {
        setLockedProjects([], this.projectTasks)
        return
      }

      try {
        const lockedProjects = await getLockedProjects(this.currentSeason.seasonId)
        setLockedProjects(lockedProjects, this.projectTasks)
      } catch {
        setLockedProjects([], this.projectTasks)
      }
    },
    async loadChallengeLevelOptions() {
      if (!this.shouldLoadChallengeLevelOptions || !this.isSportSelectionComplete) {
        this.challengeLevelOptions = []
        this.challengeLevelError = null
        return
      }

      const firstLockedTask = this.projectTasks.find(task => appState.lockedProjectIds.includes(String(task.projectId)))

      if (!firstLockedTask?.projectId) {
        this.challengeLevelOptions = []
        this.challengeLevelError = new Error('缺少已锁定项目，无法获取挑战等级')
        return
      }

      this.isChallengeLevelLoading = true

      try {
        if (this.shouldDelayChallengeLevelQuery) {
          await wait(CHALLENGE_LEVEL_QUERY_DELAY)
        }

        const levels = await getProjectLevels(firstLockedTask.projectId)
        this.challengeLevelOptions = levels.map(level => ({
          projectRuleLevelId: level.projectRuleLevelId,
          label: level.level,
          name: level.name
        }))
        this.resolveSelectedChallengeLevelName()
        this.challengeLevelError = null
      } catch (error) {
        this.challengeLevelOptions = []
        this.challengeLevelError = error
      } finally {
        this.isChallengeLevelLoading = false
      }
    },
    openTask(task) {
      const query = {
        projectId: task.projectId
      }

      if (this.currentSeason?.seasonId) {
        query.seasonId = this.currentSeason.seasonId
      }

      this.$router.push({
        name: 'project-detail',
        params: { taskName: task.name },
        query
      })
    },
    async selectChallengeLevel(level) {
      if (!this.isSeasonRegistering || this.isChallengeLevelLocking || appState.selectedChallengeLevel) {
        return
      }

      const projectRuleLevelId = level?.projectRuleLevelId

      if (!projectRuleLevelId) {
        this.challengeLevelError = new Error('缺少 project_rule_level_id，无法锁定挑战等级')
        return
      }

      if (!this.currentSeason?.seasonId) {
        this.challengeLevelError = new Error('缺少 season_id，无法锁定挑战等级')
        return
      }

      this.isChallengeLevelLocking = true

      try {
        await lockProjectLevel(this.currentSeason.seasonId, projectRuleLevelId)
        setSelectedChallengeLevel({
          projectRuleLevelId,
          level: level.label
        })
        setSeasonParticipationStatus({
          status: 'participated',
          projectRuleLevelId,
          level: level.label
        })
        this.challengeLevelError = null
      } catch (error) {
        this.challengeLevelError = error
      } finally {
        this.isChallengeLevelLocking = false
      }
    },
    resolveSelectedChallengeLevelName() {
      if (appState.selectedChallengeLevel || !appState.selectedProjectRuleLevelId) {
        return
      }

      const matchedLevel = this.challengeLevelOptions.find(level => String(level.projectRuleLevelId) === String(appState.selectedProjectRuleLevelId))

      if (!matchedLevel?.label) {
        return
      }

      setSelectedChallengeLevel({
        projectRuleLevelId: matchedLevel.projectRuleLevelId,
        level: matchedLevel.label
      })
    },
    addUploadRecord
  }
}
</script>
