import { computed, reactive } from 'vue'

export const tasks = [
  {
    name: '日常步数',
    description: '把通勤、散步和碎片运动都变成稳定积分。',
    accent: '#68d65c'
  },
  {
    name: '跑步/快走',
    description: '记录有氧强度，持续拉高身体活力曲线。',
    accent: '#ff9f45'
  },
  {
    name: '健身打卡',
    description: '用训练日历沉淀力量、柔韧和核心能力。',
    accent: '#7b8cff'
  },
  {
    name: '公司运动',
    description: '和同事组队完成企业运动挑战。',
    accent: '#20c7b5'
  },
  {
    name: '户外登山',
    description: '用路线、海拔和时长记录每一次远行。',
    accent: '#3fb06d'
  },
  {
    name: '减重挑战',
    description: '关注趋势而不是焦虑，稳步推进阶段目标。',
    accent: '#ff6f91'
  }
]

export const appState = reactive({
  lockedTaskNames: [],
  maxLockedTasks: 3,
  selectedChallengeLevel: '',
  pastSeasonReviewRecords: [
    {
      id: 'archive-20260630-run',
      seasonName: '2026 夏季赛 · 06月',
      taskName: '跑步/快走',
      fileName: 'run-june-summary.pdf',
      note: '累计里程与配速记录符合本赛季预订目标。',
      result: 'approved',
      accent: '#ff9f45',
      reviewedAt: '2026-06-30T18:30:00+08:00'
    },
    {
      id: 'archive-20260630-steps',
      seasonName: '2026 夏季赛 · 06月',
      taskName: '日常步数',
      fileName: 'steps-june.zip',
      note: '达标天数已完成审核并归档。',
      result: 'approved',
      accent: '#68d65c',
      reviewedAt: '2026-06-30T18:24:00+08:00'
    },
    {
      id: 'archive-20260531-fitness',
      seasonName: '2026 春季赛 · 05月',
      taskName: '健身打卡',
      fileName: 'fitness-may.png',
      note: '部分记录缺少单次时长信息，未计入完成次数。',
      result: 'rejected',
      accent: '#7b8cff',
      reviewedAt: '2026-05-31T19:10:00+08:00'
    }
  ],
  uploadRecords: [
    {
      id: 'mock-20260715-run',
      taskName: '跑步/快走',
      fileName: 'run-4km.png',
      note: '晚间快走 4km，用时 38 分钟，配速稳定。',
      recordType: 'daily-proof',
      reviewStatus: 'approved',
      bmi: '',
      accent: '#ff9f45',
      uploadedAt: '2026-07-15T20:42:00+08:00'
    },
    {
      id: 'mock-20260714-steps',
      taskName: '日常步数',
      fileName: 'steps-8612.png',
      note: '今日累计 8612 步，通勤和饭后散步完成。',
      recordType: 'daily-proof',
      reviewStatus: 'pending',
      bmi: '',
      accent: '#68d65c',
      uploadedAt: '2026-07-14T21:16:00+08:00'
    },
    {
      id: 'mock-20260701-weight',
      taskName: '减重挑战',
      fileName: 'weight-start.jpg',
      note: '月初空腹称重，作为本月基准记录。',
      recordType: 'month-start',
      reviewStatus: 'approved',
      bmi: '23.8',
      accent: '#ff6f91',
      uploadedAt: '2026-07-01T08:08:00+08:00'
    }
  ]
})

export const remainingLockSlots = computed(() => Math.max(appState.maxLockedTasks - appState.lockedTaskNames.length, 0))

export function findTaskByName(taskName) {
  return tasks.find(task => task.name === taskName)
}

export function isTaskLocked(task) {
  return Boolean(task && appState.lockedTaskNames.includes(task.name))
}

export function lockTask(task) {
  if (!task || isTaskLocked(task) || remainingLockSlots.value <= 0) {
    return
  }

  appState.lockedTaskNames = [...appState.lockedTaskNames, task.name]
}

export function addUploadRecord(proof) {
  const task = findTaskByName(proof.taskName)

  appState.uploadRecords = [
    {
      id: `proof-${Date.now()}`,
      ...proof,
      reviewStatus: 'pending',
      accent: task?.accent || '#72d84f',
      uploadedAt: new Date().toISOString()
    },
    ...appState.uploadRecords
  ]
}
