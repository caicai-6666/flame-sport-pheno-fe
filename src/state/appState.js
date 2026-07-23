import { computed, reactive } from 'vue'

export const appState = reactive({
  projectTasks: [],
  currentSeason: null,
  seasonAvailability: 'unknown',
  lockedProjectIds: [],
  lockedTaskNames: [],
  maxLockedTasks: 3,
  seasonParticipationStatus: 'unknown',
  selectedChallengeLevel: '',
  selectedProjectRuleLevelId: '',
  leaderboardRecords: [],
  // 历史记录只由真实接口或本次上传成功后的即时反馈写入，避免首屏出现他人的示例数据。
  pastSeasonReviewRecords: [],
  uploadRecords: []
})

export const remainingLockSlots = computed(() => Math.max(appState.maxLockedTasks - appState.lockedTaskNames.length, 0))

export function findTaskByName(taskName) {
  return appState.projectTasks.find(task => task.name === taskName)
}

export function isTaskLocked(task) {
  return Boolean(
    task &&
    (
      appState.lockedTaskNames.includes(task.name) ||
      appState.lockedProjectIds.includes(String(task.projectId))
    )
  )
}

export function setProjectTasks(projectTasks) {
  appState.projectTasks = projectTasks
}

export function setCurrentSeason(season) {
  appState.currentSeason = season
}

export function setSeasonAvailability(availability) {
  appState.seasonAvailability = availability || 'unknown'
}

export function setLockedProjects(lockedProjects, projectTasks = appState.projectTasks) {
  const lockedProjectIds = lockedProjects.map(project => String(project.projectId)).filter(Boolean)
  const lockedTaskNames = lockedProjects
    .map(project => project.name || projectTasks.find(task => String(task.projectId) === String(project.projectId))?.name)
    .filter(Boolean)

  appState.lockedProjectIds = lockedProjectIds
  appState.lockedTaskNames = lockedTaskNames
}

export function setMaxLockedTasks(maxLockedTasks) {
  appState.maxLockedTasks = Number(maxLockedTasks) || 3
}

export function setSelectedChallengeLevel(challengeLevel) {
  appState.selectedChallengeLevel = challengeLevel?.level || challengeLevel?.name || ''
  appState.selectedProjectRuleLevelId = challengeLevel?.projectRuleLevelId || ''
}

export function setUploadRecords(uploadRecords) {
  appState.uploadRecords = uploadRecords
}

export function setPastSeasonReviewRecords(pastSeasonReviewRecords) {
  appState.pastSeasonReviewRecords = pastSeasonReviewRecords
}

export function setLeaderboardRecords(leaderboardRecords) {
  appState.leaderboardRecords = leaderboardRecords
}

export function setSeasonParticipationStatus(participation) {
  appState.seasonParticipationStatus = participation?.status || 'unknown'

  if (participation?.status === 'participated') {
    appState.selectedChallengeLevel = participation.level || participation.name || ''
    appState.selectedProjectRuleLevelId = participation.projectRuleLevelId || ''
    return
  }

  appState.selectedChallengeLevel = ''
  appState.selectedProjectRuleLevelId = ''
}

export function lockTask(task) {
  if (!task || isTaskLocked(task) || remainingLockSlots.value <= 0) {
    return
  }

  if (task.projectId) {
    appState.lockedProjectIds = [...appState.lockedProjectIds, String(task.projectId)]
  }

  appState.lockedTaskNames = [...appState.lockedTaskNames, task.name]
}

export function addUploadRecord(proof) {
  const task = findTaskByName(proof.taskName)

  appState.uploadRecords = [
    {
      id: proof.id || `proof-${Date.now()}`,
      ...proof,
      reviewStatus: proof.reviewStatus || 'pending',
      accent: task?.accent || '#72d84f',
      uploadedAt: proof.uploadedAt || new Date().toISOString()
    },
    ...appState.uploadRecords
  ]
}
