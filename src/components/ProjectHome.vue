<template>
  <section class="project-home" aria-label="项目任务">
    <div class="hero-card">
      <span class="eyebrow">{{ seasonLabel }}</span>
      <h1>当前赛季可选任务</h1>
      <p>围绕日常、训练、团队和户外场景，把健康行为拆成可完成的挑战。</p>

      <Transition name="hero-guidance" mode="out-in">
        <div v-if="isSeasonSetupComplete" key="target" class="season-target-card">
          <span>当前赛季的预订目标等级 -- {{ selectedChallengeLevel }}</span>
        </div>

        <div v-else key="guide" class="setup-guide">
          <ol class="signup-progress" aria-label="赛季报名进度">
            <li
              v-for="step in signupSteps"
              :key="step.key"
              :class="`is-${step.status}`"
            >
              <strong>{{ step.index }}</strong>
              <div>
                <span>{{ step.title }}</span>
                <small>{{ step.description }}</small>
              </div>
            </li>
          </ol>

          <p class="setup-caution">三项运动使用同一挑战等级，请谨慎选择。</p>

          <div v-if="isSportSelectionComplete" class="level-picker" role="group" aria-label="选择挑战等级">
            <button
              v-for="level in challengeLevels"
              :key="level"
              type="button"
              :class="{ 'is-selected': selectedChallengeLevel === level }"
              @click="$emit('select-level', level)"
            >
              {{ level }}
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <div class="task-grid">
      <button
        v-for="task in tasks"
        :key="task.name"
        type="button"
        class="task-card"
        :class="{
          'is-pressed': pressedTask === task.name,
          'is-recovering': recoveringTask === task.name,
          'is-locked': isTaskLocked(task),
          'is-disabled': isTaskDisabled(task)
        }"
        :disabled="isTaskDisabled(task)"
        :aria-pressed="isTaskLocked(task)"
        :style="{ '--accent': task.accent }"
        @pointerdown="pressTask(task)"
        @pointerup="releaseTask(task)"
        @pointerleave="cancelPress(task)"
        @pointercancel="cancelPress(task)"
        @keydown.enter.prevent="selectWithKeyboard(task)"
        @keydown.space.prevent="selectWithKeyboard(task)"
        @transitionend="finishRecovery(task, $event)"
      >
        <span class="task-card-header">
          <span class="task-name">{{ task.name }}</span>
          <span class="task-illustration" aria-hidden="true">
            <img :src="taskIcon(task)" :alt="`${task.name}图标`">
          </span>
        </span>
        <span v-if="isTaskLocked(task)" class="locked-badge">已锁定</span>
        <span class="task-description">{{ taskDescription(task) }}</span>
        <span class="task-link">{{ taskActionText(task) }}</span>
      </button>
    </div>

    <Transition name="upload-panel">
      <UploadProofPanel
        v-if="activeUploadTask"
        :task="activeUploadTask"
        @close="closeUploadPanel"
        @submit-proof="$emit('submit-proof', $event)"
      />
    </Transition>
  </section>
</template>

<script>
import UploadProofPanel from './UploadProofPanel.vue'
import companySportIcon from '../assets/公司运动.png'
import dailyStepsIcon from '../assets/日常步数.png'
import fitnessIcon from '../assets/健身打卡.png'
import hikingIcon from '../assets/登山.png'
import runningIcon from '../assets/跑步.png'
import weightLossIcon from '../assets/减重.png'
import { findChallengeRule } from '../state/challengeConfig'

const taskIconMap = {
  日常步数: dailyStepsIcon,
  '跑步/快走': runningIcon,
  健身打卡: fitnessIcon,
  公司运动: companySportIcon,
  户外登山: hikingIcon,
  减重挑战: weightLossIcon
}

export default {
  name: 'ProjectHome',
  components: {
    UploadProofPanel
  },
  data() {
    return {
      pressedTask: '',
      recoveringTask: '',
      pendingTask: null,
      activeUploadTask: null,
      challengeLevels: ['青铜', '白银', '黄金']
    }
  },
  props: {
    tasks: {
      type: Array,
      required: true
    },
    lockedTaskNames: {
      type: Array,
      default: () => []
    },
    maxLockedTasks: {
      type: Number,
      default: 3
    },
    selectedChallengeLevel: {
      type: String,
      default: ''
    }
  },
  computed: {
    seasonLabel() {
      const now = new Date()
      const month = now.getMonth()
      const seasonNames = ['冬季赛', '冬季赛', '春季赛', '春季赛', '春季赛', '夏季赛', '夏季赛', '夏季赛', '秋季赛', '秋季赛', '秋季赛', '冬季赛']
      const startDate = new Date(now.getFullYear(), month, 1)
      const endDate = new Date(now.getFullYear(), month + 1, 0)
      const formatDate = date => `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`

      return `${seasonNames[month]} · ${formatDate(startDate)}–${formatDate(endDate)}`
    },
    remainingLockSlots() {
      return Math.max(this.maxLockedTasks - this.lockedTaskNames.length, 0)
    },
    isSportSelectionComplete() {
      return this.lockedTaskNames.length >= this.maxLockedTasks
    },
    isSeasonSetupComplete() {
      return this.isSportSelectionComplete && Boolean(this.selectedChallengeLevel)
    },
    signupSteps() {
      return [
        {
          key: 'tasks',
          index: 1,
          title: '选择三个项目',
          description: `已选择 ${this.lockedTaskNames.length}/${this.maxLockedTasks}`,
          status: this.isSportSelectionComplete ? 'complete' : 'current'
        },
        {
          key: 'level',
          index: 2,
          title: '选择挑战等级',
          description: this.selectedChallengeLevel || '三项挑战共用等级',
          status: this.selectedChallengeLevel ? 'complete' : this.isSportSelectionComplete ? 'current' : 'upcoming'
        },
        {
          key: 'success',
          index: 3,
          title: '报名成功',
          description: '生成赛季目标',
          status: this.isSeasonSetupComplete ? 'complete' : 'upcoming'
        }
      ]
    }
  },
  methods: {
    isTaskLocked(task) {
      return this.lockedTaskNames.includes(task.name)
    },
    isTaskDisabled(task) {
      return !this.isTaskLocked(task) && this.remainingLockSlots <= 0
    },
    taskIcon(task) {
      return task.iconUrl || task.icon || taskIconMap[task.name] || dailyStepsIcon
    },
    taskDescription(task) {
      if (!this.isSeasonSetupComplete || !this.isTaskLocked(task)) {
        return task.description
      }

      const challenge = findChallengeRule(task.name, this.selectedChallengeLevel)

      if (!challenge) {
        return task.description
      }

      return challenge.metrics.map(metric => `${metric.label} ${metric.value}`).join(' · ')
    },
    taskActionText(task) {
      if (this.isTaskDisabled(task)) {
        return '选择已满'
      }

      if (this.isSeasonSetupComplete && this.isTaskLocked(task)) {
        return '上传凭证 →'
      }

      return '查看挑战 →'
    },
    pressTask(task) {
      if (this.isTaskDisabled(task)) {
        return
      }

      this.recoveringTask = ''
      this.pendingTask = null
      this.pressedTask = task.name
    },
    releaseTask(task) {
      if (this.pressedTask !== task.name) {
        return
      }

      this.pressedTask = ''
      this.recoveringTask = task.name
      this.pendingTask = task
    },
    cancelPress(task) {
      if (this.pressedTask === task.name) {
        this.pressedTask = ''
      }
    },
    selectWithKeyboard(task) {
      if (this.isTaskDisabled(task)) {
        return
      }

      this.pressTask(task)

      window.setTimeout(() => {
        this.releaseTask(task)
      }, 120)
    },
    finishRecovery(task, event) {
      if (event.propertyName !== 'transform' || this.recoveringTask !== task.name) {
        return
      }

      const selectedTask = this.pendingTask || task
      this.recoveringTask = ''
      this.pendingTask = null

      if (this.isSeasonSetupComplete && this.isTaskLocked(selectedTask)) {
        this.openUploadPanel(selectedTask)
        return
      }

      this.$emit('select-task', selectedTask)
    },
    openUploadPanel(task) {
      this.activeUploadTask = task
    },
    closeUploadPanel() {
      this.activeUploadTask = null
    }
  },
  emits: ['select-task', 'select-level', 'submit-proof']
}
</script>

<style scoped>
.project-home {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hero-card {
  position: relative;
  overflow: hidden;
  padding: 24px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 32px;
  background:
    radial-gradient(circle at 82% 18%, rgba(114, 216, 79, 0.5), transparent 26%),
    linear-gradient(140deg, rgba(255, 255, 255, 0.94), rgba(241, 249, 237, 0.86));
  box-shadow: 0 18px 44px rgba(47, 89, 55, 0.12);
}

.hero-card::after {
  position: absolute;
  right: -34px;
  bottom: -46px;
  width: 150px;
  height: 150px;
  border: 1px solid rgba(47, 143, 50, 0.18);
  border-radius: 50%;
  content: '';
}

.eyebrow {
  color: #2f8f32;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.hero-card h1 {
  max-width: 100%;
  margin: 10px 0 8px;
  font-size: clamp(26px, 7.2vw, 30px);
  line-height: 1.14;
  letter-spacing: -0.03em;
  white-space: nowrap;
}

.hero-card p {
  max-width: 290px;
  margin: 0;
  color: #68766d;
  font-size: 14px;
  line-height: 1.7;
}

.setup-guide,
.season-target-card {
  position: relative;
  z-index: 1;
  margin-top: 18px;
}

.signup-progress {
  --progress-line: rgba(23, 33, 27, 0.13);
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
}

.signup-progress li {
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.signup-progress li:not(:last-child)::after {
  position: absolute;
  z-index: 0;
  top: 15px;
  left: calc(50% + 15px);
  width: calc(100% - 30px);
  height: 1px;
  background: var(--progress-line);
  content: '';
}

.signup-progress li.is-complete:not(:last-child)::after {
  background: rgba(57, 181, 74, 0.54);
}

.signup-progress li > strong {
  position: relative;
  z-index: 1;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(23, 33, 27, 0.08);
  color: #5d6961;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 950;
}

.signup-progress li.is-current > strong {
  background: linear-gradient(135deg, #ff7a90, #e03d58);
  color: #fff;
  box-shadow: 0 8px 18px rgba(224, 61, 88, 0.24);
}

.signup-progress li.is-complete > strong {
  background: linear-gradient(135deg, #70dd4d, #39b54a);
  color: #fff;
  box-shadow: 0 8px 18px rgba(58, 181, 74, 0.24);
}

.signup-progress div {
  width: 100%;
  min-width: 0;
  margin-top: 8px;
}

.signup-progress span {
  display: block;
  color: #17211b;
  font-size: 12px;
  font-weight: 950;
  line-height: 1.2;
}

.signup-progress small {
  display: block;
  margin-top: 4px;
  color: #68766d;
  font-size: 10px;
  font-weight: 750;
  line-height: 1.35;
}

.signup-progress li.is-current span {
  color: #c54266;
}

.signup-progress li.is-complete span {
  color: #2f8f32;
}

.signup-progress li.is-upcoming {
  opacity: 0.5;
}

.setup-caution {
  margin: 12px 0 0;
  color: #8a4a5b;
  font-size: 10px;
  font-weight: 850;
  line-height: 1.45;
  transform: translateY(6px);
  white-space: nowrap;
}

.level-picker {
  margin-top: 24px;
  padding: 6px;
  border: 1px solid rgba(47, 143, 50, 0.12);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.62);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.level-picker button {
  min-height: 36px;
  border: 0;
  border-radius: 15px;
  background: rgba(23, 33, 27, 0.06);
  color: #4f5d55;
  cursor: pointer;
  font-size: 12px;
  font-weight: 950;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    color 0.2s ease,
    transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.level-picker button:hover,
.level-picker button.is-selected {
  background: linear-gradient(135deg, #70dd4d, #39b54a);
  color: #fff;
  box-shadow: 0 10px 20px rgba(58, 181, 74, 0.26);
  transform: translateY(-1px);
}

.season-target-card {
  width: fit-content;
  max-width: 100%;
  padding: 12px 14px;
  border: 1px solid rgba(47, 143, 50, 0.16);
  border-radius: 22px;
  background:
    linear-gradient(135deg, rgba(23, 33, 27, 0.94), rgba(47, 83, 53, 0.9)),
    #17211b;
  color: #fff;
  box-shadow: 0 14px 30px rgba(23, 33, 27, 0.16);
}

.season-target-card span {
  display: block;
  font-size: 14px;
  font-weight: 950;
  line-height: 1.25;
}

.season-target-card strong {
  display: block;
  margin-top: 5px;
  color: rgba(255, 255, 255, 0.66);
  font-size: 11px;
  font-weight: 800;
  line-height: 1.35;
}

.hero-guidance-enter-active,
.hero-guidance-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.hero-guidance-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

.hero-guidance-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.task-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.task-card {
  min-height: 162px;
  padding: 16px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 26px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(255, 255, 255, 0.74)),
    #fff;
  box-shadow: 0 14px 34px rgba(38, 64, 45, 0.08);
  color: #17211b;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  transform: translateY(0) scale(1);
  transform-origin: center;
  transition:
    border-color 0.24s ease,
    background 0.24s ease,
    box-shadow 0.24s ease,
    transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1);
  user-select: none;
  touch-action: manipulation;
}

.task-card-header {
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.task-illustration {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.58);
  box-shadow: inset 0 0 0 1px rgba(23, 33, 27, 0.05);
  display: grid;
  place-items: center;
  pointer-events: none;
}

.task-illustration img {
  width: 38px;
  height: 38px;
  display: block;
  object-fit: contain;
}

.task-card:disabled {
  font: inherit;
}

.task-card:hover:not(.is-pressed):not(.is-recovering) {
  border-color: color-mix(in srgb, var(--accent), #fff 24%);
  box-shadow: 0 18px 40px rgba(38, 64, 45, 0.13);
  transform: translateY(-2px);
}

.task-card.is-pressed {
  border-color: color-mix(in srgb, var(--accent), #fff 34%);
  background:
    linear-gradient(180deg, rgba(247, 252, 244, 0.92), rgba(237, 247, 232, 0.82)),
    #fff;
  box-shadow:
    inset 0 8px 18px rgba(38, 64, 45, 0.08),
    0 6px 18px rgba(38, 64, 45, 0.08);
  transform: translateY(6px) scale(0.94);
  transition-duration: 0.18s;
}

.task-card.is-recovering {
  pointer-events: none;
}

.task-card.is-locked {
  border-color: color-mix(in srgb, var(--accent), #fff 12%);
  background:
    radial-gradient(circle at 88% 12%, color-mix(in srgb, var(--accent), transparent 68%), transparent 28%),
    linear-gradient(180deg, color-mix(in srgb, var(--accent), #fff 84%), rgba(255, 255, 255, 0.78)),
    #fff;
  box-shadow:
    0 18px 42px color-mix(in srgb, var(--accent), transparent 76%),
    inset 0 0 0 1px color-mix(in srgb, var(--accent), transparent 76%);
}

.task-card.is-disabled {
  cursor: not-allowed;
  opacity: 0.48;
  filter: grayscale(0.28);
  box-shadow: none;
}

.task-card.is-disabled:hover {
  border-color: rgba(23, 33, 27, 0.08);
  transform: none;
}

.locked-badge {
  align-self: flex-start;
  margin-top: 8px;
  padding: 5px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent), #fff 72%);
  color: color-mix(in srgb, var(--accent), #111 26%);
  font-size: 11px;
  font-weight: 900;
}

.task-name {
  min-width: 0;
  font-size: 16px;
  font-weight: 850;
  line-height: 1.2;
}

.task-description {
  margin-top: 10px;
  color: #717d75;
  font-size: 12px;
  line-height: 1.55;
}

.task-link {
  margin-top: auto;
  padding-top: 14px;
  color: color-mix(in srgb, var(--accent), #111 18%);
  font-size: 12px;
  font-weight: 850;
}

</style>
