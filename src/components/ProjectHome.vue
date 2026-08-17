<template>
  <section class="project-home" aria-label="项目任务">
    <div class="hero-card">
      <button
        type="button"
        class="activity-detail-trigger"
        @click="openActivityDetail"
      >
        <span class="activity-detail-trigger-label">活动详情</span>
        <span class="activity-detail-trigger-arrow" aria-hidden="true">↗</span>
      </button>

      <span class="eyebrow">{{ seasonLabel }}</span>
      <h1>{{ heroTitle }}</h1>
      <p>{{ heroDescription }}</p>

      <div
        ref="heroGuidanceFrame"
        class="hero-guidance-frame"
      >
        <Transition
          name="hero-guidance"
          mode="out-in"
          @before-leave="lockHeroGuidanceHeight"
          @enter="animateHeroGuidanceHeight"
          @after-enter="clearHeroGuidanceHeight"
        >
          <div v-if="isNoActiveSeason" key="unavailable" class="season-target-card">
            <span>新赛季敬请期待</span>
            <strong>当前暂无进行中的赛季，你可以先浏览运动项目与挑战规则。</strong>
          </div>

          <div v-else-if="isSeasonWriteFrozen" key="write-frozen" class="season-target-card">
            <span>赛季即将开始</span>
            <strong>{{ seasonWriteMessage }}</strong>
          </div>

          <div v-else-if="shouldShowSeasonResultCard" key="target" class="season-target-card">
            <span>{{ seasonResultTitle }}</span>
            <strong v-if="seasonResultDescription">{{ seasonResultDescription }}</strong>
          </div>

          <div v-else-if="shouldShowSeasonChecking" key="checking" class="season-target-card is-checking">
            <span>正在确认赛季报名状态</span>
            <span class="season-check-spinner" aria-hidden="true"></span>
          </div>

          <div v-else-if="shouldShowSetupGuide" key="guide" class="setup-guide">
            <ol class="signup-progress" aria-label="赛季报名进度">
              <li
                v-for="step in signupSteps"
                :key="step.key"
                :class="[
                  `is-${step.status}`,
                  {
                    'is-level-animating': step.key === 'level' && isLevelStepAnimating,
                    'is-progressing-to-success': step.key === 'level' && isSuccessStepAnimating,
                    'is-success-animating': step.key === 'success' && isSuccessStepAnimating
                  }
                ]"
              >
                <strong>{{ step.index }}</strong>
                <span
                  v-if="step.key === 'success' && isSuccessStepAnimating"
                  class="level-progress-burst"
                  aria-hidden="true"
                >
                  <span
                    v-for="particle in levelProgressParticles"
                    :key="particle.id"
                    class="level-progress-particle"
                    :style="{
                      '--angle': `${particle.angle}deg`,
                      '--distance': `${particle.distance}px`,
                      '--particle-color': particle.color,
                      '--particle-size': `${particle.size}px`,
                      '--delay': `${particle.delay}ms`
                    }"
                  ></span>
                </span>
                <div>
                  <span>{{ step.title }}</span>
                  <small>{{ step.description }}</small>
                </div>
              </li>
            </ol>

            <div v-if="isSportSelectionComplete" class="level-picker" role="group" aria-label="选择挑战等级">
              <button
                v-for="level in challengeLevelOptions"
                :key="level.projectRuleLevelId || level.label"
                type="button"
                :class="{
                  'is-selected': selectedChallengeLevel === level.label,
                  'is-confirming': confirmingChallengeLevel === level.label,
                  'is-locking': pendingChallengeLevel === level.label && isLevelLockingInProgress,
                  'is-failed': failedChallengeLevel === level.label
                }"
                :disabled="isChallengeLevelButtonDisabled(level)"
                @click="handleChallengeLevelClick(level)"
              >
                <span class="level-button-content">
                  <Transition name="level-label" mode="out-in">
                    <span
                      :key="levelButtonText(level)"
                      class="level-button-label"
                    >
                      {{ levelButtonText(level) }}
                    </span>
                  </Transition>
                </span>
              </button>
            </div>

            <p v-if="levelPickerHint" class="level-picker-hint">
              {{ levelPickerHint }}
            </p>
          </div>

          <div v-else key="unknown" class="season-target-card">
            <span>暂时无法确认赛季报名状态</span>
          </div>
        </Transition>
      </div>
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
            <img v-if="taskIcon(task)" :src="taskIcon(task)" :alt="`${task.name}图标`">
          </span>
        </span>
        <span class="locked-badge" :class="{ 'is-hidden': !isTaskLocked(task) }">已锁定</span>
        <span class="task-description-frame">
          <Transition
            name="task-description"
            mode="out-in"
            @before-leave="lockTransitionFrameHeight"
            @enter="animateTransitionFrameHeight"
            @after-enter="clearTransitionFrameHeight"
          >
            <span
              :key="taskDisplayDescription(task)"
              class="task-description"
              :class="{ 'is-challenge-requirement': shouldShowChallengeRequirement(task) }"
            >
              {{ taskDisplayDescription(task) }}
            </span>
          </Transition>
        </span>
        <span class="task-link">{{ taskActionText(task) }}</span>
      </button>

      <!-- 意见收集不属于后端项目，不参与项目锁定与赛季状态判断，固定排在全部项目之后。 -->
      <button type="button" class="task-card feedback-card" style="--accent: #ee55b8" @click="openSuggestionPanel">
        <span class="task-card-header">
          <span class="task-name">意见收集</span>
          <span class="task-illustration" aria-hidden="true">
            <img :src="feedbackIcon" alt="">
          </span>
        </span>
        <span class="task-description-frame">
          <span class="task-description">你的每一条建议，都能让燃动现象变得更好。</span>
        </span>
        <span class="task-link">提交建议 →</span>
      </button>
    </div>

    <Transition name="upload-panel">
      <UploadProofPanel
        v-if="activeUploadTask"
        :task="activeUploadTask"
        :season="season"
        :season-id="seasonId"
        :is-write-frozen="isSeasonWriteFrozen"
        @close="closeUploadPanel"
        @submit-proof="$emit('submit-proof', $event)"
      />
    </Transition>

    <SuggestionPanel v-if="isSuggestionPanelOpen" @close="closeSuggestionPanel" />

    <Teleport to="body">
      <Transition name="activity-detail-panel">
        <div
          v-if="isActivityDetailOpen"
          class="activity-detail-overlay"
          role="presentation"
          @click.self="closeActivityDetail"
        >
          <section
            class="activity-detail-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-detail-title"
          >
            <header class="activity-detail-header">
              <div>
                <span>ACTIVITY GUIDE</span>
                <h2 id="activity-detail-title">活动详情</h2>
              </div>
              <button type="button" aria-label="关闭活动详情" @click="closeActivityDetail">×</button>
            </header>

            <div class="activity-rule-scroll">
              <div v-if="!isActivityRuleImageLoaded && !isActivityRuleImageError" class="activity-rule-loading">
                <span aria-hidden="true"></span>
                <p>正在加载活动规则…</p>
              </div>
              <div v-else-if="isActivityRuleImageError" class="activity-rule-error">
                <strong>活动规则加载失败</strong>
                <button type="button" @click="reloadActivityRuleImage">重新加载</button>
              </div>
              <img
                :key="activityRuleImageKey"
                :src="activityRuleImage"
                alt="燃动现象运动季活动规则"
                decoding="async"
                :class="{ 'is-visible': isActivityRuleImageLoaded }"
                @load="handleActivityRuleImageLoad"
                @error="handleActivityRuleImageError"
              >
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<script>
import UploadProofPanel from './UploadProofPanel.vue'
import activityRuleImage from '../assets/活动规则.webp'
import feedbackIcon from '../assets/xinxiang.webp'
import SuggestionPanel from './SuggestionPanel.vue'

export default {
  name: 'ProjectHome',
  components: {
    UploadProofPanel,
    SuggestionPanel
  },
  data() {
    return {
      pressedTask: '',
      recoveringTask: '',
      pendingTask: null,
      activeUploadTask: null,
      isSuggestionPanelOpen: false,
      confirmingChallengeLevel: '',
      pendingChallengeLevel: '',
      failedChallengeLevel: '',
      challengeLevelConfirmTimer: null,
      challengeLevelFailureTimer: null,
      levelLockRequestTimer: null,
      isLevelLockingHolding: false,
      levelLockingHoldTimer: null,
      isLevelCompletionAnimating: false,
      levelCompletionTimer: null,
      levelProgressParticles: [],
      isActivityDetailOpen: false,
      isActivityRuleImageLoaded: false,
      isActivityRuleImageError: false,
      activityRuleImageKey: 0,
      activityDetailPreviousBodyOverflow: '',
      activityRuleImage,
      feedbackIcon
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
    },
    season: {
      type: Object,
      default: null
    },
    seasonId: {
      type: [String, Number],
      default: ''
    },
    challengeLevelOptions: {
      type: Array,
      default: () => []
    },
    seasonParticipationStatus: {
      type: String,
      default: 'unknown'
    },
    isNoActiveSeason: {
      type: Boolean,
      default: false
    },
    isSeasonParticipationLoading: {
      type: Boolean,
      default: false
    },
    isChallengeLevelLoading: {
      type: Boolean,
      default: false
    },
    isChallengeLevelLocking: {
      type: Boolean,
      default: false
    },
    challengeLevelError: {
      type: [Object, String],
      default: null
    },
    isSeasonWriteFrozen: {
      type: Boolean,
      default: false
    },
    seasonWriteMessage: {
      type: String,
      default: ''
    }
  },
  computed: {
    seasonLabel() {
      if (this.isNoActiveSeason) {
        return '敬请期待'
      }

      if (!this.season) {
        return '当前赛季'
      }

      const duration = this.seasonDuration
      const seasonName = this.season.name || '当前赛季'

      return duration ? `${seasonName} · ${duration}` : seasonName
    },
    heroTitle() {
      return this.isNoActiveSeason ? '新赛季敬请期待' : '当前赛季可选任务'
    },
    heroDescription() {
      return this.isNoActiveSeason
        ? '赛季开启后即可选择项目、锁定挑战等级并上传运动记录。'
        : '围绕日常、训练、团队和户外场景，把健康行为拆成可完成的挑战。'
    },
    seasonDuration() {
      if (!this.season?.startDate || !this.season?.endDate) {
        return ''
      }

      const formatDate = value => {
        const date = new Date(value)
        return `${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
      }

      return `${formatDate(this.season.startDate)}–${formatDate(this.season.endDate)}`
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
    isSeasonRegistering() {
      return this.seasonParticipationStatus === 'registering'
    },
    shouldShowSetupGuide() {
      return !this.isNoActiveSeason && !this.isSeasonWriteFrozen && (this.isSeasonRegistering || this.isLevelLockingHolding || this.isLevelCompletionAnimating)
    },
    isSeasonRegistrationClosed() {
      return this.seasonParticipationStatus === 'closed'
    },
    shouldShowSeasonChecking() {
      return !this.isNoActiveSeason && !this.isSeasonWriteFrozen && (this.isSeasonParticipationLoading || this.seasonParticipationStatus === 'unknown' || this.isParticipatedLevelResolving)
    },
    isParticipatedLevelResolving() {
      return this.seasonParticipationStatus === 'participated' && !this.selectedChallengeLevel
    },
    shouldShowSeasonResultCard() {
      if (this.isSeasonRegistrationClosed) {
        return true
      }

      return Boolean(this.selectedChallengeLevel) && !this.isLevelLockingHolding && !this.isLevelCompletionAnimating
    },
    seasonResultTitle() {
      if (this.isSeasonRegistrationClosed) {
        return '已超过本赛季报名时间'
      }

      return `当前赛季的预订目标等级 -- ${this.selectedChallengeLevel}`
    },
    seasonResultDescription() {
      return ''
    },
    isLevelLockingInProgress() {
      return Boolean(this.pendingChallengeLevel && !this.failedChallengeLevel && (!this.selectedChallengeLevel || this.isLevelLockingHolding)) || this.isChallengeLevelLocking
    },
    isLevelStepAnimating() {
      return this.isLevelLockingInProgress && !this.selectedChallengeLevel && !this.isSuccessStepAnimating
    },
    isSuccessStepAnimating() {
      return this.isLevelCompletionAnimating
    },
    signupSteps() {
      return [
        {
          key: 'tasks',
          index: 1,
          title: `选择 ${this.maxLockedTasks} 个项目`,
          description: `已选择 ${this.lockedTaskNames.length}/${this.maxLockedTasks}，还需 ${this.remainingLockSlots} 个`,
          status: this.isSportSelectionComplete ? 'complete' : 'current'
        },
        {
          key: 'level',
          index: 2,
          title: '选择挑战等级',
          description: this.levelStepDescription,
          status: this.selectedChallengeLevel ? 'complete' : this.isSportSelectionComplete ? 'current' : 'upcoming'
        },
        {
          key: 'success',
          index: 3,
          title: '报名成功',
          description: '生成赛季目标',
          status: this.successStepStatus
        }
      ]
    },
    successStepStatus() {
      if (this.isSuccessStepAnimating) {
        return 'current'
      }

      return this.isSeasonSetupComplete ? 'complete' : 'upcoming'
    },
    levelStepDescription() {
      if (this.selectedChallengeLevel) {
        return this.selectedChallengeLevel
      }

      if (this.isLevelLockingInProgress) {
        return '正在锁定挑战等级'
      }

      if (this.isChallengeLevelLoading) {
        return '正在加载可选等级'
      }

      return `${this.maxLockedTasks}项挑战共用等级`
    },
    levelPickerHint() {
      if (!this.isSportSelectionComplete || this.selectedChallengeLevel) {
        return ''
      }

      if (this.isChallengeLevelLoading) {
        return '正在加载挑战等级...'
      }

      if (!this.challengeLevelOptions.length) {
        return '暂无可选挑战等级'
      }

      return ''
    }
  },
  watch: {
    selectedChallengeLevel(newValue, oldValue) {
      if (newValue && newValue !== oldValue) {
        this.finishLevelLockingWithDelay()
      }
    },
    challengeLevelError(error) {
      if (error) {
        this.showChallengeLevelFailure()
      }
    },
    isSeasonWriteFrozen(isFrozen) {
      if (isFrozen) {
        // 保护期可能在页面停留期间开始，立即收起写入面板并取消尚未提交的确认态。
        this.closeUploadPanel()
        this.confirmingChallengeLevel = ''
        this.pendingChallengeLevel = ''
      }
    }
  },
  methods: {
    lockHeroGuidanceHeight(element) {
      this.lockFrameHeight(this.$refs.heroGuidanceFrame, element)
    },
    animateHeroGuidanceHeight(element) {
      this.animateFrameHeight(this.$refs.heroGuidanceFrame, element)
    },
    clearHeroGuidanceHeight() {
      this.clearFrameHeight(this.$refs.heroGuidanceFrame)
    },
    lockTransitionFrameHeight(element) {
      this.lockFrameHeight(element.parentElement, element)
    },
    animateTransitionFrameHeight(element) {
      this.animateFrameHeight(element.parentElement, element)
    },
    clearTransitionFrameHeight(element) {
      this.clearFrameHeight(element.parentElement)
    },
    lockFrameHeight(frame, element) {
      if (!frame) {
        return
      }

      frame.style.height = `${element.offsetHeight}px`
      frame.style.overflow = 'hidden'
    },
    animateFrameHeight(frame, element) {
      if (!frame) {
        return
      }

      const targetHeight = element.offsetHeight

      if (!frame.style.height) {
        frame.style.height = `${targetHeight}px`
      }

      window.requestAnimationFrame(() => {
        frame.style.height = `${targetHeight}px`
      })
    },
    clearFrameHeight(frame) {

      if (!frame) {
        return
      }

      frame.style.height = ''
      frame.style.overflow = ''
    },
    isChallengeLevelButtonDisabled(level) {
      return Boolean(
        this.isChallengeLevelLoading ||
        this.isChallengeLevelLocking ||
        this.isSeasonWriteFrozen ||
        this.pendingChallengeLevel ||
        this.selectedChallengeLevel ||
        this.failedChallengeLevel ||
        !level ||
        (this.confirmingChallengeLevel && this.confirmingChallengeLevel !== level.label)
      )
    },
    levelButtonText(level) {
      if (this.pendingChallengeLevel === level.label && this.isLevelLockingInProgress) {
        return '锁定中'
      }

      if (this.selectedChallengeLevel === level.label) {
        return level.label
      }

      if (this.failedChallengeLevel === level.label) {
        return '锁定失败'
      }

      if (this.confirmingChallengeLevel === level.label) {
        return `确认${level.label}`
      }

      return level.label
    },
    handleChallengeLevelClick(level) {
      if (this.isChallengeLevelButtonDisabled(level)) {
        return
      }

      if (this.confirmingChallengeLevel !== level.label) {
        this.startChallengeLevelConfirm(level)
        return
      }

      this.confirmChallengeLevel(level)
    },
    startChallengeLevelConfirm(level) {
      this.clearChallengeLevelFailure()
      this.confirmingChallengeLevel = level.label

      if (this.challengeLevelConfirmTimer) {
        window.clearTimeout(this.challengeLevelConfirmTimer)
      }

      this.challengeLevelConfirmTimer = window.setTimeout(() => {
        this.confirmingChallengeLevel = ''
        this.challengeLevelConfirmTimer = null
      }, 1800)
    },
    confirmChallengeLevel(level) {
      this.confirmingChallengeLevel = ''
      this.pendingChallengeLevel = level.label

      if (this.challengeLevelConfirmTimer) {
        window.clearTimeout(this.challengeLevelConfirmTimer)
        this.challengeLevelConfirmTimer = null
      }

      if (this.levelLockRequestTimer) {
        window.clearTimeout(this.levelLockRequestTimer)
      }

      this.levelLockRequestTimer = window.setTimeout(() => {
        this.levelLockRequestTimer = null
        this.$emit('select-level', level)
      }, 2000)
    },
    isTaskLocked(task) {
      return this.lockedTaskNames.includes(task.name)
    },
    isTaskDisabled(task) {
      return this.shouldShowSeasonChecking || (!this.isNoActiveSeason && !this.isTaskLocked(task) && this.remainingLockSlots <= 0)
    },
    taskIcon(task) {
      return task.iconUrl || task.icon || ''
    },
    shouldShowChallengeRequirement(task) {
      return Boolean(this.selectedChallengeLevel && task.challengeRequirement)
    },
    taskDisplayDescription(task) {
      if (this.shouldShowChallengeRequirement(task)) {
        return `${this.selectedChallengeLevel}要求：${task.challengeRequirement}`
      }

      return task.description
    },
    taskActionText(task) {
      if (this.shouldShowSeasonChecking) {
        return '正在确认状态'
      }

      if (this.isNoActiveSeason) {
        return '查看挑战 →'
      }

      if (this.isSeasonWriteFrozen) {
        return '查看挑战 →'
      }

      if (this.isTaskDisabled(task)) {
        return '选择已满'
      }

      if (this.isSeasonSetupComplete && this.isTaskLocked(task)) {
        return '上传记录 →'
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

      if (this.isSeasonSetupComplete && this.isTaskLocked(selectedTask) && !this.isSeasonWriteFrozen) {
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
    },
    openSuggestionPanel() {
      this.isSuggestionPanelOpen = true
    },
    closeSuggestionPanel() {
      this.isSuggestionPanelOpen = false
    },
    openActivityDetail() {
      if (this.isActivityDetailOpen) {
        return
      }

      this.isActivityRuleImageLoaded = false
      this.isActivityRuleImageError = false
      this.activityRuleImageKey += 1
      this.isActivityDetailOpen = true
      this.activityDetailPreviousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', this.handleActivityDetailKeydown)
    },
    closeActivityDetail() {
      if (!this.isActivityDetailOpen) {
        return
      }

      this.isActivityDetailOpen = false
      document.body.style.overflow = this.activityDetailPreviousBodyOverflow
      window.removeEventListener('keydown', this.handleActivityDetailKeydown)
    },
    handleActivityDetailKeydown(event) {
      if (event.key === 'Escape') {
        this.closeActivityDetail()
      }
    },
    handleActivityRuleImageLoad() {
      this.isActivityRuleImageLoaded = true
      this.isActivityRuleImageError = false
    },
    handleActivityRuleImageError() {
      this.isActivityRuleImageLoaded = false
      this.isActivityRuleImageError = true
    },
    reloadActivityRuleImage() {
      this.isActivityRuleImageLoaded = false
      this.isActivityRuleImageError = false
      this.activityRuleImageKey += 1
    },
    playLevelCompletionAnimation() {
      this.isLevelLockingHolding = false
      this.pendingChallengeLevel = this.selectedChallengeLevel
      this.confirmingChallengeLevel = ''
      this.clearChallengeLevelFailure()
      this.isLevelCompletionAnimating = true
      this.launchLevelProgressBurst()

      if (this.levelCompletionTimer) {
        window.clearTimeout(this.levelCompletionTimer)
      }

      this.levelCompletionTimer = window.setTimeout(() => {
        this.isLevelCompletionAnimating = false
        this.pendingChallengeLevel = ''
        this.levelProgressParticles = []
        this.levelCompletionTimer = null
      }, 1050)
    },
    launchLevelProgressBurst() {
      const colors = ['#ffffff', '#baf19d', '#72d84f', '#20c7b5', '#ffd166', '#ff9f45']

      this.levelProgressParticles = Array.from({ length: 20 }, (_, index) => ({
        id: `${Date.now()}-${index}`,
        angle: Math.round((360 / 20) * index + Math.random() * 18 - 9),
        distance: Math.round(30 + Math.random() * 30),
        color: colors[index % colors.length],
        size: Math.round(4 + Math.random() * 4),
        delay: Math.round(Math.random() * 45)
      }))
    },
    finishLevelLockingWithDelay() {
      const minimumLockingDurationAfterSuccess = 1100

      if (!this.pendingChallengeLevel) {
        return
      }

      this.isLevelLockingHolding = true

      if (this.levelLockingHoldTimer) {
        window.clearTimeout(this.levelLockingHoldTimer)
      }

      this.levelLockingHoldTimer = window.setTimeout(() => {
        this.isLevelLockingHolding = false
        this.levelLockingHoldTimer = null
        this.playLevelCompletionAnimation()
      }, minimumLockingDurationAfterSuccess)
    },
    showChallengeLevelFailure() {
      this.isLevelLockingHolding = false
      this.confirmingChallengeLevel = ''
      this.failedChallengeLevel = this.pendingChallengeLevel
      this.pendingChallengeLevel = ''

      if (this.challengeLevelConfirmTimer) {
        window.clearTimeout(this.challengeLevelConfirmTimer)
        this.challengeLevelConfirmTimer = null
      }

      if (this.challengeLevelFailureTimer) {
        window.clearTimeout(this.challengeLevelFailureTimer)
      }

      if (this.levelLockingHoldTimer) {
        window.clearTimeout(this.levelLockingHoldTimer)
        this.levelLockingHoldTimer = null
      }

      if (this.levelLockRequestTimer) {
        window.clearTimeout(this.levelLockRequestTimer)
        this.levelLockRequestTimer = null
      }

      this.challengeLevelFailureTimer = window.setTimeout(() => {
        this.failedChallengeLevel = ''
        this.challengeLevelFailureTimer = null
      }, 1400)
    },
    clearChallengeLevelFailure() {
      this.failedChallengeLevel = ''

      if (this.challengeLevelFailureTimer) {
        window.clearTimeout(this.challengeLevelFailureTimer)
        this.challengeLevelFailureTimer = null
      }
    }
  },
  deactivated() {
    // 首页被 KeepAlive 暂存时关闭 Teleport 弹层，避免切换底部导航后仍遮挡其他页面。
    this.closeActivityDetail()
    this.closeSuggestionPanel()
  },
  beforeUnmount() {
    if (this.isActivityDetailOpen) {
      document.body.style.overflow = this.activityDetailPreviousBodyOverflow
    }

    window.removeEventListener('keydown', this.handleActivityDetailKeydown)

    if (this.challengeLevelConfirmTimer) {
      window.clearTimeout(this.challengeLevelConfirmTimer)
    }

    if (this.challengeLevelFailureTimer) {
      window.clearTimeout(this.challengeLevelFailureTimer)
    }

    if (this.levelLockRequestTimer) {
      window.clearTimeout(this.levelLockRequestTimer)
    }

    if (this.levelLockingHoldTimer) {
      window.clearTimeout(this.levelLockingHoldTimer)
    }

    if (this.levelCompletionTimer) {
      window.clearTimeout(this.levelCompletionTimer)
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
  max-width: calc(100% - 96px);
  color: #2f8f32;
  display: block;
  font-size: 11px;
  font-weight: 900;
  line-height: 1.35;
  letter-spacing: 0.16em;
}

.hero-card h1 {
  max-width: 100%;
  margin: 20px 0 8px;
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

.hero-guidance-frame {
  position: relative;
  z-index: 1;
  margin-top: 18px;
  min-height: 44px;
  transition: height 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.setup-guide,
.season-target-card {
  position: relative;
  z-index: 1;
}

.activity-detail-trigger {
  position: absolute;
  z-index: 3;
  top: 18px;
  right: 18px;
  isolation: isolate;
  overflow: hidden;
  min-width: 82px;
  padding: 9px 9px 9px 11px;
  border: 1px solid rgba(47, 143, 50, 0.2);
  border-radius: 18px;
  background:
    radial-gradient(circle at 78% 10%, rgba(114, 216, 79, 0.3), transparent 44%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(235, 248, 230, 0.9)),
    #f3faef;
  box-shadow:
    0 11px 24px rgba(47, 89, 55, 0.14),
    0 2px 6px rgba(47, 89, 55, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.96),
    inset 0 -1px 0 rgba(47, 143, 50, 0.08);
  color: #287b2d;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font: inherit;
  font-size: 12px;
  font-weight: 950;
  line-height: 1.2;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.activity-detail-trigger::before {
  position: absolute;
  z-index: -1;
  top: 1px;
  right: 8px;
  left: 8px;
  height: 42%;
  border-top: 1px solid rgba(255, 255, 255, 0.94);
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.3), transparent);
  content: '';
  pointer-events: none;
}

.activity-detail-trigger-label,
.activity-detail-trigger-arrow {
  position: relative;
  z-index: 1;
}

.activity-detail-trigger-arrow {
  width: 19px;
  height: 19px;
  flex: 0 0 auto;
  border: 1px solid rgba(47, 143, 50, 0.12);
  border-radius: 7px;
  background: rgba(114, 216, 79, 0.13);
  display: grid;
  place-items: center;
  font-size: 11px;
  line-height: 1;
  transition:
    background 0.18s ease,
    transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.activity-detail-trigger:focus-visible {
  outline: 3px solid rgba(114, 216, 79, 0.24);
  outline-offset: 2px;
}

.activity-detail-trigger:active {
  box-shadow:
    0 5px 12px rgba(47, 89, 55, 0.1),
    inset 0 2px 5px rgba(47, 89, 55, 0.08);
  transform: translateY(2px) scale(0.98);
}

.activity-detail-trigger:active .activity-detail-trigger-arrow {
  transform: translate(1px, -1px);
}

@media (hover: hover) {
  .activity-detail-trigger:hover {
    border-color: rgba(47, 143, 50, 0.3);
    background:
      radial-gradient(circle at 78% 10%, rgba(114, 216, 79, 0.4), transparent 46%),
      linear-gradient(145deg, #fff, rgba(230, 247, 224, 0.94));
    box-shadow:
      0 14px 28px rgba(47, 89, 55, 0.17),
      0 3px 7px rgba(47, 89, 55, 0.08),
      inset 0 1px 0 #fff;
    transform: translateY(-1px);
  }

  .activity-detail-trigger:hover .activity-detail-trigger-arrow {
    background: rgba(114, 216, 79, 0.2);
    transform: translate(1px, -1px);
  }
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

.signup-progress li.is-level-animating > strong {
  background: linear-gradient(135deg, #ffb84d, #ff7a45);
  color: #fff;
  box-shadow:
    0 8px 18px rgba(255, 122, 69, 0.28),
    0 0 0 5px rgba(255, 184, 77, 0.16);
  animation: level-step-pulse 1.1s ease-in-out infinite;
}

.signup-progress li.is-level-animating > strong::after {
  position: absolute;
  inset: -6px;
  border: 2px solid rgba(255, 184, 77, 0.22);
  border-top-color: #ff7a45;
  border-right-color: rgba(255, 255, 255, 0.82);
  border-radius: 50%;
  box-sizing: border-box;
  content: '';
  animation: level-step-ring-rotate 760ms linear infinite;
}

.signup-progress li.is-complete.is-level-animating > strong {
  background: linear-gradient(135deg, #70dd4d, #39b54a);
  color: #fff;
  box-shadow: 0 8px 18px rgba(58, 181, 74, 0.24);
  animation: none;
}

.signup-progress li.is-complete.is-level-animating > strong::after {
  content: none;
  animation: none;
}

.signup-progress li.is-success-animating > strong {
  background: linear-gradient(135deg, #70dd4d, #39b54a);
  color: #fff;
  box-shadow:
    0 10px 22px rgba(58, 181, 74, 0.28),
    0 0 0 7px rgba(114, 216, 79, 0.16);
  animation: level-step-pop 720ms cubic-bezier(0.16, 0.9, 0.28, 1);
}

.signup-progress li.is-progressing-to-success:not(:last-child)::after {
  background: linear-gradient(90deg, rgba(57, 181, 74, 0.54), rgba(186, 241, 157, 0.94), rgba(57, 181, 74, 0.54));
  background-size: 180% 100%;
  animation: level-progress-line 760ms ease-out;
}

.level-progress-burst {
  position: absolute;
  z-index: 2;
  top: 15px;
  left: 50%;
  width: 1px;
  height: 1px;
  display: block;
  pointer-events: none;
}

.level-progress-particle {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--particle-size);
  height: calc(var(--particle-size) * 0.72);
  border-radius: 999px;
  background: var(--particle-color);
  box-shadow: 0 0 9px color-mix(in srgb, var(--particle-color), transparent 42%);
  display: block;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.4);
  animation: level-progress-burst 820ms cubic-bezier(0.16, 0.9, 0.28, 1) forwards;
  animation-delay: var(--delay);
}

.level-progress-particle:nth-child(3n) {
  border-radius: 2px;
}

.level-progress-particle:nth-child(4n) {
  width: calc(var(--particle-size) * 0.7);
  height: calc(var(--particle-size) * 0.7);
}

@keyframes level-step-pulse {
  0%,
  100% {
    filter: brightness(1);
    transform: scale(1);
  }

  50% {
    filter: brightness(1.08);
    transform: scale(1.06);
  }
}

@keyframes level-step-ring-rotate {
  to {
    transform: rotate(360deg);
  }
}

@keyframes level-step-pop {
  0% {
    transform: scale(0.82);
  }

  42% {
    transform: scale(1.14);
  }

  100% {
    transform: scale(1);
  }
}

@keyframes level-progress-line {
  0% {
    background-position: 100% 0;
  }

  100% {
    background-position: 0 0;
  }
}

@keyframes level-progress-burst {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.35) rotate(0deg);
  }

  18%,
  72% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform:
      translate(-50%, -50%)
      rotate(var(--angle))
      translateY(calc(var(--distance) * -1))
      scale(0.82)
      rotate(460deg);
  }
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

.signup-progress li.is-success-animating span {
  color: #2f8f32;
}

.signup-progress li.is-upcoming {
  opacity: 0.5;
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
  position: relative;
  overflow: hidden;
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

.level-picker button::after {
  position: absolute;
  inset: 0;
  width: 58%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.74), transparent);
  content: '';
  opacity: 0;
  pointer-events: none;
  transform: translateX(-130%) skewX(-18deg);
}

.level-picker button:hover:not(.is-selected):not(.is-confirming):not(.is-locking):not(.is-failed):not(:disabled) {
  background: rgba(23, 33, 27, 0.08);
  color: #3d4a42;
  box-shadow: none;
  transform: translateY(-1px);
}

.level-picker button.is-selected {
  background: linear-gradient(135deg, #70dd4d, #39b54a);
  color: #fff;
  box-shadow: 0 10px 20px rgba(58, 181, 74, 0.26);
  transform: translateY(-1px);
}

.level-picker button.is-confirming {
  background: linear-gradient(135deg, #ffb84d, #ff7a45);
  color: #fff;
  box-shadow:
    0 10px 20px rgba(255, 122, 69, 0.28),
    0 0 0 4px rgba(255, 184, 77, 0.14);
  animation: level-button-pulse 1.1s ease-in-out infinite;
}

.level-picker button.is-locking {
  background: linear-gradient(135deg, #e8f7ff, #bfe8ff);
  color: #17445f;
  box-shadow:
    0 10px 20px rgba(40, 151, 220, 0.18),
    inset 0 -2px 0 rgba(23, 68, 95, 0.08);
  animation: none;
}

.level-picker button.is-failed {
  background: linear-gradient(135deg, #ff8f8f, #ff5c5c);
  color: #fff;
  box-shadow:
    0 10px 20px rgba(255, 92, 92, 0.24),
    0 0 0 4px rgba(255, 92, 92, 0.14);
  animation: none;
}

.level-picker button.is-selected {
  animation: level-button-complete 720ms cubic-bezier(0.16, 0.9, 0.28, 1);
}

.level-picker button.is-selected::after {
  animation: level-button-shine 780ms ease-out;
}

.level-picker button:disabled {
  cursor: not-allowed;
}

.level-picker button:disabled:not(.is-confirming):not(.is-locking):not(.is-failed):not(.is-selected) {
  opacity: 0.58;
}

.level-picker button.is-locking:disabled,
.level-picker button.is-failed:disabled,
.level-picker button.is-selected:disabled {
  opacity: 1;
}

.level-button-content {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}

.level-button-label {
  display: inline-block;
  min-width: 42px;
}

.level-label-enter-active,
.level-label-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.level-label-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.96);
}

.level-label-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}

@keyframes level-button-pulse {
  0%,
  100% {
    filter: brightness(1);
  }

  50% {
    filter: brightness(1.08);
  }
}

@keyframes level-button-complete {
  0% {
    transform: translateY(0) scale(0.95);
  }

  42% {
    transform: translateY(-1px) scale(1.06);
  }

  100% {
    transform: translateY(-1px) scale(1);
  }
}

@keyframes level-button-shine {
  0% {
    opacity: 0;
    transform: translateX(-130%) skewX(-18deg);
  }

  18% {
    opacity: 0.9;
  }

  100% {
    opacity: 0;
    transform: translateX(230%) skewX(-18deg);
  }
}

.level-picker-hint {
  margin: 10px 0 0;
  color: #68766d;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.45;
  text-align: center;
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

.season-target-card.is-checking {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.season-target-card span {
  display: block;
  font-size: 14px;
  font-weight: 950;
  line-height: 1.25;
}

.season-target-card .season-check-spinner {
  display: block;
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
  border: 2px solid rgba(255, 255, 255, 0.32);
  border-top-color: #fff;
  border-radius: 999px;
  animation: season-check-spin 760ms linear infinite;
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
    opacity 0.28s ease,
    transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.hero-guidance-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

.hero-guidance-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

@keyframes season-check-spin {
  to {
    transform: rotate(360deg);
  }
}

.activity-detail-overlay {
  position: fixed;
  z-index: 100;
  inset: 0;
  width: min(100vw, 430px);
  margin: 0 auto;
  padding:
    max(14px, env(safe-area-inset-top))
    14px
    max(14px, env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: rgba(18, 27, 21, 0.42);
  display: flex;
  backdrop-filter: blur(6px);
}

.activity-detail-panel {
  min-width: 0;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 30px;
  background: #f7fbf4;
  box-shadow: 0 26px 64px rgba(23, 33, 27, 0.3);
  color: #17211b;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.activity-detail-header {
  flex: 0 0 auto;
  padding: 17px 18px 14px;
  border-bottom: 1px solid rgba(23, 33, 27, 0.07);
  background:
    radial-gradient(circle at 84% 12%, rgba(114, 216, 79, 0.24), transparent 32%),
    rgba(255, 255, 255, 0.92);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.activity-detail-header span {
  color: #2f8f32;
  display: block;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: 0.16em;
}

.activity-detail-header h2 {
  margin: 4px 0 0;
  font-size: 20px;
  line-height: 1.15;
  letter-spacing: -0.03em;
}

.activity-detail-header button {
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  border: 0;
  border-radius: 14px;
  background: rgba(23, 33, 27, 0.06);
  color: #17211b;
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
}

.activity-rule-scroll {
  position: relative;
  min-height: 0;
  flex: 1 1 auto;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.activity-rule-scroll img {
  width: 100%;
  height: auto;
  background: #fff;
  display: block;
  opacity: 0;
  transition: opacity 0.22s ease;
}

.activity-rule-scroll img.is-visible {
  opacity: 1;
}

.activity-rule-loading,
.activity-rule-error {
  position: absolute;
  z-index: 1;
  inset: 0;
  min-height: 220px;
  padding: 24px;
  box-sizing: border-box;
  background: #f7fbf4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  text-align: center;
}

.activity-rule-loading > span {
  width: 22px;
  height: 22px;
  border: 3px solid rgba(47, 143, 50, 0.16);
  border-top-color: #39b54a;
  border-radius: 50%;
  animation: season-check-spin 760ms linear infinite;
}

.activity-rule-loading p {
  margin: 0;
  color: #68766d;
  font-size: 12px;
  font-weight: 800;
}

.activity-rule-error strong {
  font-size: 14px;
}

.activity-rule-error button {
  padding: 8px 13px;
  border: 0;
  border-radius: 13px;
  background: #39b54a;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
}

.activity-detail-panel-enter-active,
.activity-detail-panel-leave-active {
  transition: opacity 0.24s ease;
}

.activity-detail-panel-enter-active .activity-detail-panel,
.activity-detail-panel-leave-active .activity-detail-panel {
  transition:
    opacity 0.24s ease,
    transform 0.26s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.activity-detail-panel-enter-from,
.activity-detail-panel-leave-to {
  opacity: 0;
}

.activity-detail-panel-enter-from .activity-detail-panel,
.activity-detail-panel-leave-to .activity-detail-panel {
  opacity: 0;
  transform: translateY(18px) scale(0.98);
}

.task-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.task-card {
  position: relative;
  overflow: hidden;
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

.task-card > span {
  position: relative;
  z-index: 1;
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
  background: transparent;
  box-shadow: none;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.task-illustration img {
  width: 42px;
  height: 42px;
  background: transparent;
  display: block;
  filter: drop-shadow(0 5px 8px rgba(23, 33, 27, 0.12));
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
  border-color: color-mix(in srgb, var(--accent), #e9edf0 22%);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(224, 231, 229, 0.82) 36%, rgba(255, 255, 255, 0.88) 57%, color-mix(in srgb, var(--accent), #fff 84%)),
    linear-gradient(90deg, rgba(255, 255, 255, 0.2), rgba(92, 102, 96, 0.08), rgba(255, 255, 255, 0.26)),
    #f7f9f8;
  box-shadow:
    0 18px 42px color-mix(in srgb, var(--accent), transparent 78%),
    inset 0 1px 0 rgba(255, 255, 255, 0.92),
    inset 0 -1px 0 rgba(61, 72, 66, 0.08);
}

.task-card.is-locked::before,
.task-card.is-locked::after {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  content: '';
}

.task-card.is-locked::before {
  z-index: 0;
  background:
    linear-gradient(105deg, transparent 8%, rgba(255, 255, 255, 0.16) 18%, rgba(120, 132, 126, 0.12) 28%, transparent 40%),
    repeating-linear-gradient(118deg, rgba(255, 255, 255, 0.18) 0 1px, transparent 1px 13px);
  opacity: 0.74;
}

.task-card.is-locked::after {
  z-index: 2;
  width: 64%;
  transform: translateX(-130%) skewX(-18deg);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.86) 46%, color-mix(in srgb, var(--accent), #fff 48%) 56%, transparent);
  mix-blend-mode: screen;
  animation: locked-metal-sheen 2.8s ease-in-out infinite;
}

.task-card.is-locked:hover:not(.is-pressed):not(.is-recovering) {
  border-color: color-mix(in srgb, var(--accent), #fff 8%);
  box-shadow:
    0 20px 46px color-mix(in srgb, var(--accent), transparent 72%),
    inset 0 1px 0 rgba(255, 255, 255, 0.94),
    inset 0 -1px 0 rgba(61, 72, 66, 0.08);
}

@keyframes locked-metal-sheen {
  0% {
    transform: translateX(-135%) skewX(-18deg);
    opacity: 0;
  }

  18% {
    opacity: 0.9;
  }

  54% {
    opacity: 0.72;
  }

  78%,
  100% {
    transform: translateX(190%) skewX(-18deg);
    opacity: 0;
  }
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

.feedback-card {
  border-color: color-mix(in srgb, var(--accent), #fff 74%);
  background:
    radial-gradient(circle at 88% 14%, rgba(255, 131, 209, 0.2), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 247, 253, 0.82)),
    #fff;
  cursor: pointer;
}

.feedback-card:hover {
  border-color: color-mix(in srgb, var(--accent), #fff 60%);
  box-shadow: 0 18px 40px rgba(238, 85, 184, 0.14);
  transform: translateY(-2px);
}

.feedback-card .task-illustration {
  background: transparent;
}

.feedback-card .task-link {
  color: color-mix(in srgb, var(--accent), #17211b 30%);
}

.locked-badge {
  align-self: flex-start;
  margin-top: 8px;
  padding: 5px 10px;
  border: 1px solid rgba(255, 255, 255, 0.64);
  border-radius: 999px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(207, 216, 214, 0.7) 46%, rgba(255, 255, 255, 0.86)),
    color-mix(in srgb, var(--accent), #fff 78%);
  box-shadow:
    0 7px 16px color-mix(in srgb, var(--accent), transparent 82%),
    inset 0 1px 0 rgba(255, 255, 255, 0.86);
  color: color-mix(in srgb, var(--accent), #17211b 34%);
  font-size: 11px;
  font-weight: 950;
  transition:
    opacity 0.18s ease,
    transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.locked-badge.is-hidden {
  visibility: hidden;
  opacity: 0;
  transform: translateY(-2px);
}

.task-name {
  min-width: 0;
  font-size: 16px;
  font-weight: 850;
  line-height: 1.2;
}

.task-description-frame {
  width: 100%;
  margin-top: 10px;
  min-height: 37px;
  display: block;
  transition: height 0.24s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.task-description {
  color: #717d75;
  display: block;
  font-size: 12px;
  line-height: 1.55;
}

.task-description.is-challenge-requirement {
  color: color-mix(in srgb, var(--accent), #17211b 42%);
  font-weight: 850;
}

.task-description-enter-active,
.task-description-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.task-description-enter-from {
  opacity: 0;
  transform: translateY(5px);
}

.task-description-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

.task-link {
  margin-top: auto;
  padding-top: 14px;
  color: color-mix(in srgb, var(--accent), #111 18%);
  font-size: 12px;
  font-weight: 850;
}

@media (prefers-reduced-motion: reduce) {
  .signup-progress li.is-level-animating > strong,
  .signup-progress li.is-level-animating > strong::after,
  .signup-progress li.is-success-animating > strong,
  .signup-progress li.is-progressing-to-success:not(:last-child)::after,
  .level-progress-particle,
  .level-picker button.is-confirming,
  .level-picker button.is-selected,
  .level-picker button.is-selected::after,
  .activity-rule-scroll img,
  .activity-rule-loading > span,
  .activity-detail-panel-enter-active,
  .activity-detail-panel-leave-active,
  .activity-detail-panel-enter-active .activity-detail-panel,
  .activity-detail-panel-leave-active .activity-detail-panel,
  .activity-detail-trigger,
  .activity-detail-trigger-arrow,
  .task-description-frame,
  .task-description-enter-active,
  .task-description-leave-active {
    animation: none;
    transition: none;
  }

  .level-progress-particle {
    display: none;
  }

  .task-card.is-locked::after {
    animation: none;
    transform: translateX(18%) skewX(-18deg);
    opacity: 0.34;
  }
}

</style>
