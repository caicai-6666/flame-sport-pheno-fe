<template>
  <section class="project-detail" :style="{ '--accent': task.accent }">
    <div class="detail-hero">
      <span class="detail-eyebrow">ACTIVE CHALLENGE</span>
      <h1>{{ task.name }}</h1>
      <p>{{ task.description }}</p>
      <div class="detail-actions">
        <div class="lock-button-stage">
          <button
            type="button"
            class="lock-button"
            :class="{
              'is-locked': isLocked,
              'is-confirming': isLockConfirming
            }"
            :disabled="isLocked || remainingLockSlots <= 0"
            @click="handleLockClick"
          >
            <Transition name="lock-label" mode="out-in">
              <span
                :key="lockButtonText"
                class="lock-button-label"
              >
                {{ lockButtonText }}
              </span>
            </Transition>
          </button>

          <span
            v-for="burst in lockConfettiBursts"
            :key="burst.id"
            class="lock-confetti-burst"
            aria-hidden="true"
          >
            <span
              v-for="particle in burst.particles"
              :key="particle.id"
              class="lock-confetti-piece"
              :style="{
                '--angle': `${particle.angle}deg`,
                '--distance': `${particle.distance}px`,
                '--confetti-color': particle.color,
                '--confetti-size': `${particle.size}px`,
                '--delay': `${particle.delay}ms`
              }"
            ></span>
          </span>
        </div>
        <span class="lock-warning">锁定后本赛季不可更改，请确认后再提交。</span>
        <span class="lock-hint">{{ lockHint }}</span>
      </div>
    </div>

    <div class="challenge-list">
      <article
        v-for="challenge in challenges"
        :key="challenge.level"
        class="challenge-card"
        :class="{
          'is-selected-level': isSelectedChallenge(challenge),
          'is-dimmed-level': isDimmedChallenge(challenge)
        }"
      >
        <div class="challenge-header">
          <span class="level-dot" :class="challenge.tone"></span>
          <div>
            <strong>{{ challenge.medal }} {{ challenge.level }}挑战</strong>
            <span>{{ challenge.subtitle }}</span>
          </div>
        </div>

        <div class="challenge-metrics">
          <div
            v-for="metric in challenge.metrics"
            :key="metric.label"
            class="metric-pill"
          >
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
          </div>
        </div>

        <div class="challenge-footer">
          <span>{{ challenge.note }}</span>
        </div>
      </article>
    </div>

    <Transition name="upload-panel">
      <div
        v-if="isUploadOpen"
        class="upload-overlay"
        role="presentation"
        @click="closeUploadPanel"
      >
        <aside
          class="upload-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-panel-title"
          @click.stop
          @touchstart.passive="startUploadSwipe"
          @touchend.passive="finishUploadSwipe"
        >
          <header class="upload-panel-header">
            <div>
              <span class="upload-kicker">UPLOAD PROOF</span>
              <h2 id="upload-panel-title">{{ uploadPanelTitle }}</h2>
            </div>
            <button class="upload-close" type="button" aria-label="关闭上传弹窗" @click="closeUploadPanel">×</button>
          </header>

          <div class="upload-summary">
            <span>{{ uploadSummaryLabel }}</span>
            <strong>{{ selectedProofName || '未选择图片' }}</strong>
          </div>

          <form
            class="upload-form"
            :class="{ 'is-weight-form': isWeightChallenge }"
            @submit.prevent="submitProof"
          >
            <label class="upload-dropzone" :class="{ 'has-preview': proofPreviewUrl }">
              <input ref="proofFileInput" type="file" accept="image/*" @change="handleProofUpload">
              <template v-if="proofPreviewUrl">
                <img :src="proofPreviewUrl" :alt="`${task.name}凭证预览`">
                <span class="replace-proof">更换图片</span>
              </template>
              <template v-else>
                <span class="upload-icon">＋</span>
                <strong>点击上传图片</strong>
                <small>{{ uploadHelpText }}</small>
              </template>
            </label>

            <div v-if="isWeightChallenge" class="weight-proof-fields">
              <div class="record-type-toggle" role="group" aria-label="选择体重记录类型">
                <button
                  v-for="recordType in weightRecordTypes"
                  :key="recordType.value"
                  type="button"
                  :class="{ 'is-active': proofRecordType === recordType.value }"
                  @click="proofRecordType = recordType.value"
                >
                  <strong>{{ recordType.label }}</strong>
                  <small>{{ recordType.hint }}</small>
                </button>
              </div>

              <label class="bmi-field">
                <span>BMI</span>
                <input
                  v-model.trim="proofBmi"
                  type="number"
                  inputmode="decimal"
                  min="10"
                  max="60"
                  step="0.1"
                  placeholder="例如 23.6"
                >
              </label>
            </div>

            <label class="proof-note">
              <span>备注</span>
              <textarea
                v-model.trim="proofNote"
                maxlength="80"
                :placeholder="proofNotePlaceholder"
              ></textarea>
            </label>

            <button
              class="submit-proof"
              type="submit"
              :class="{ 'is-confirming': isProofSubmitConfirming }"
              :disabled="!canSubmitProof"
            >
              <Transition name="submit-proof-label" mode="out-in">
                <span
                  :key="submitProofButtonText"
                  class="submit-proof-label"
                >
                  {{ submitProofButtonText }}
                </span>
              </Transition>
            </button>
          </form>
        </aside>
      </div>
    </Transition>

    <button
      class="upload-fab"
      type="button"
      :disabled="!canOpenUploadPanel"
      :aria-label="uploadButtonAriaLabel"
      @click="openUploadPanel"
    >
      +
    </button>
  </section>
</template>

<script>
const challengeRules = {
  日常步数: [
    {
      medal: '🥉',
      level: '青铜',
      tone: 'bronze',
      subtitle: '建立稳定的每日步行习惯',
      metrics: [
        { label: '每日步数', value: '6000步/天' },
        { label: '达标天数', value: '累计15天' }
      ],
      note: '按自然日统计达标记录'
    },
    {
      medal: '🥈',
      level: '白银',
      tone: 'silver',
      subtitle: '提升日常活动量与持续性',
      metrics: [
        { label: '每日步数', value: '8000步/天' },
        { label: '达标天数', value: '累计20天' }
      ],
      note: '适合已有基础运动习惯'
    },
    {
      medal: '🥇',
      level: '黄金',
      tone: 'gold',
      subtitle: '完成高频、高稳定度目标',
      metrics: [
        { label: '每日步数', value: '10000步/天' },
        { label: '达标天数', value: '累计22天' }
      ],
      note: '挑战当前赛季最高步数标准'
    }
  ],
  '跑步/快走': [
    {
      medal: '🥉',
      level: '青铜',
      tone: 'bronze',
      subtitle: '完成基础有氧里程',
      metrics: [
        { label: '累计距离', value: '25km' },
        { label: '配速要求', value: "≤8'30''" }
      ],
      note: '跑步或快走均可累计'
    },
    {
      medal: '🥈',
      level: '白银',
      tone: 'silver',
      subtitle: '提升有氧容量和节奏控制',
      metrics: [
        { label: '累计距离', value: '50km' },
        { label: '配速要求', value: "≤8'00''" }
      ],
      note: '保持稳定配速完成累计'
    },
    {
      medal: '🥇',
      level: '黄金',
      tone: 'gold',
      subtitle: '挑战高里程与更快配速',
      metrics: [
        { label: '累计距离', value: '85km' },
        { label: '配速要求', value: "≤7'30''" }
      ],
      note: '当前赛季进阶有氧目标'
    }
  ],
  健身打卡: [
    {
      medal: '🥉',
      level: '青铜',
      tone: 'bronze',
      subtitle: '完成基础训练频次',
      metrics: [
        { label: '累计次数', value: '8次' },
        { label: '单次时长', value: '≥30min' }
      ],
      note: '瑜伽、力量、拉伸等均可'
    },
    {
      medal: '🥈',
      level: '白银',
      tone: 'silver',
      subtitle: '形成稳定训练节奏',
      metrics: [
        { label: '累计次数', value: '12次' },
        { label: '单次时长', value: '≥30min' }
      ],
      note: '适合每周多次训练安排'
    },
    {
      medal: '🥇',
      level: '黄金',
      tone: 'gold',
      subtitle: '完成高频健身挑战',
      metrics: [
        { label: '累计次数', value: '16次' },
        { label: '单次时长', value: '≥30min' }
      ],
      note: '爬楼、游泳、跳绳等均可'
    }
  ],
  公司运动: [
    {
      medal: '🥉',
      level: '青铜',
      tone: 'bronze',
      subtitle: '参与团队运动项目',
      metrics: [
        { label: '运动类型', value: '羽毛球/篮球' },
        { label: '累计参与', value: '2次' }
      ],
      note: '以公司组织活动记录为准'
    },
    {
      medal: '🥈',
      level: '白银',
      tone: 'silver',
      subtitle: '保持团队运动参与度',
      metrics: [
        { label: '运动类型', value: '羽毛球/篮球' },
        { label: '累计参与', value: '3次' }
      ],
      note: '鼓励与同事组队完成'
    },
    {
      medal: '🥇',
      level: '黄金',
      tone: 'gold',
      subtitle: '完成高参与度团队挑战',
      metrics: [
        { label: '运动类型', value: '羽毛球/篮球' },
        { label: '累计参与', value: '4次' }
      ],
      note: '当前赛季团队运动目标'
    }
  ],
  户外登山: [
    {
      medal: '🥉',
      level: '青铜',
      tone: 'bronze',
      subtitle: '完成基础户外路线',
      metrics: [
        { label: '距离要求', value: '1次≥5km' },
        { label: '海拔要求', value: '≥300m' }
      ],
      note: '路线距离和海拔需同时满足'
    },
    {
      medal: '🥈',
      level: '白银',
      tone: 'silver',
      subtitle: '增加户外挑战频次',
      metrics: [
        { label: '距离要求', value: '2次≥5km' },
        { label: '海拔要求', value: '≥300m' }
      ],
      note: '适合月内多次短线登山'
    },
    {
      medal: '🥇',
      level: '黄金',
      tone: 'gold',
      subtitle: '挑战更高强度路线',
      metrics: [
        { label: '距离要求', value: '3次≥8km' },
        { label: '海拔要求', value: '≥300m' }
      ],
      note: '当前赛季户外进阶目标'
    }
  ],
  减重挑战: [
    {
      medal: '🥉',
      level: '青铜',
      tone: 'bronze',
      subtitle: '按 BMI 分级设置减重目标',
      metrics: [
        { label: 'BMI < 24', value: '1.5kg' },
        { label: '24–28', value: '2kg' },
        { label: '≥28', value: '2.5kg' }
      ],
      note: '以赛季起止体重变化计算'
    },
    {
      medal: '🥈',
      level: '白银',
      tone: 'silver',
      subtitle: '提高阶段性减重目标',
      metrics: [
        { label: 'BMI < 24', value: '2kg' },
        { label: '24–28', value: '3kg' },
        { label: '≥28', value: '4kg' }
      ],
      note: '目标随初始 BMI 区间递增'
    },
    {
      medal: '🥇',
      level: '黄金',
      tone: 'gold',
      subtitle: '完成当前赛季最高减重挑战',
      metrics: [
        { label: 'BMI < 24', value: '2.5kg' },
        { label: '24–28', value: '4kg' },
        { label: '≥28', value: '5.5kg' }
      ],
      note: '建议结合健康饮食和运动'
    }
  ]
}

const uploadProofConfig = {
  日常步数: {
    uploadHelp: '步数截图、手环记录或健康 App 截图',
    notePlaceholder: '例如：今日累计 8600 步，含通勤步行和晚饭后散步'
  },
  '跑步/快走': {
    uploadHelp: '跑步 App 轨迹、距离或配速截图',
    notePlaceholder: '例如：晚间快走 4km，用时 38 分钟，配速 9\'30"'
  },
  健身打卡: {
    uploadHelp: '训练照片、健身房打卡或课程记录',
    notePlaceholder: '例如：力量训练 45 分钟，包含深蹲、卧推和拉伸'
  },
  公司运动: {
    uploadHelp: '活动现场照片、报名记录或群内打卡截图',
    notePlaceholder: '例如：参加公司羽毛球活动 1 次，双打约 60 分钟'
  },
  户外登山: {
    uploadHelp: '路线轨迹、海拔记录或登山照片',
    notePlaceholder: '例如：完成南山路线 6.2km，累计爬升 360m'
  },
  减重挑战: {
    uploadHelp: '体重秤照片或体重记录截图',
    notePlaceholder: '例如：空腹称重，体重秤放置在同一位置'
  },
  default: {
    uploadHelp: '运动记录、截图或现场照片',
    notePlaceholder: '补充说明本次凭证的运动内容'
  }
}

const weightRecordTypes = [
  { value: 'month-start', label: '月初记录', hint: '基准体重' },
  { value: 'month-end', label: '月末记录', hint: '复测体重' }
]

export default {
  name: 'ProjectDetail',
  data() {
    return {
      isUploadOpen: false,
      proofNote: '',
      proofRecordType: 'month-start',
      proofBmi: '',
      proofPreviewUrl: '',
      selectedProofName: '',
      isLockConfirming: false,
      lockConfirmTimer: null,
      lockConfettiBursts: [],
      lockConfettiTimers: [],
      isProofSubmitConfirming: false,
      proofSubmitConfirmTimer: null,
      uploadTouchStartX: 0,
      uploadTouchStartY: 0
    }
  },
  props: {
    task: {
      type: Object,
      required: true
    },
    isLocked: {
      type: Boolean,
      default: false
    },
    remainingLockSlots: {
      type: Number,
      default: 3
    },
    selectedChallengeLevel: {
      type: String,
      default: ''
    }
  },
  computed: {
    challenges() {
      return challengeRules[this.task.name] || []
    },
    lockButtonText() {
      if (this.isLocked) {
        return '已锁定'
      }

      if (this.remainingLockSlots <= 0) {
        return '选择已满'
      }

      return this.isLockConfirming ? '确认锁定' : '锁定这个运动'
    },
    lockHint() {
      if (this.isLocked) {
        return '该运动已加入本赛季挑战'
      }

      if (this.remainingLockSlots <= 0) {
        return '本赛季最多锁定 3 个运动'
      }

      return `还能选择 ${this.remainingLockSlots} 个运动`
    },
    uploadConfig() {
      return uploadProofConfig[this.task.name] || uploadProofConfig.default
    },
    isWeightChallenge() {
      return this.task.name === '减重挑战'
    },
    weightRecordTypes() {
      return weightRecordTypes
    },
    uploadPanelTitle() {
      return this.isWeightChallenge ? '上传减重记录' : `上传${this.task.name}凭证`
    },
    uploadSummaryLabel() {
      if (!this.isWeightChallenge) {
        return '今日凭证'
      }

      return this.proofRecordType === 'month-start' ? '月初体重' : '月末体重'
    },
    uploadHelpText() {
      return this.uploadConfig.uploadHelp
    },
    proofNotePlaceholder() {
      return this.uploadConfig.notePlaceholder
    },
    canOpenUploadPanel() {
      return this.isLocked && Boolean(this.selectedChallengeLevel)
    },
    uploadButtonAriaLabel() {
      if (!this.isLocked) {
        return '锁定运动后才能上传凭证'
      }

      if (!this.selectedChallengeLevel) {
        return '确定挑战等级后才能上传凭证'
      }

      return '上传每日凭证'
    },
    canSubmitProof() {
      return Boolean(this.selectedProofName) && (!this.isWeightChallenge || Boolean(this.proofBmi))
    },
    submitProofButtonText() {
      return this.isProofSubmitConfirming ? '确认提交' : '提交凭证'
    }
  },
  methods: {
    isSelectedChallenge(challenge) {
      return Boolean(this.selectedChallengeLevel) && challenge.level === this.selectedChallengeLevel
    },
    isDimmedChallenge(challenge) {
      return Boolean(this.selectedChallengeLevel) && challenge.level !== this.selectedChallengeLevel
    },
    handleLockClick() {
      if (this.isLocked || this.remainingLockSlots <= 0) {
        return
      }

      if (!this.isLockConfirming) {
        this.startLockConfirm()
        return
      }

      this.confirmLockTask()
    },
    startLockConfirm() {
      this.isLockConfirming = true

      if (this.lockConfirmTimer) {
        window.clearTimeout(this.lockConfirmTimer)
      }

      this.lockConfirmTimer = window.setTimeout(() => {
        this.isLockConfirming = false
        this.lockConfirmTimer = null
      }, 1800)
    },
    confirmLockTask() {
      this.isLockConfirming = false

      if (this.lockConfirmTimer) {
        window.clearTimeout(this.lockConfirmTimer)
        this.lockConfirmTimer = null
      }

      this.launchLockConfetti()
      this.$emit('lock-task', this.task)
    },
    launchLockConfetti() {
      const colors = ['#ffffff', '#baf19d', '#72d84f', '#20c7b5', '#ffd166', '#ff9f45']
      const burst = {
        id: Date.now(),
        particles: Array.from({ length: 22 }, (_, index) => ({
          id: index,
          angle: Math.round((360 / 22) * index + Math.random() * 18 - 9),
          distance: Math.round(46 + Math.random() * 58),
          color: colors[index % colors.length],
          size: Math.round(5 + Math.random() * 5),
          delay: Math.round(Math.random() * 50)
        }))
      }

      this.lockConfettiBursts = [...this.lockConfettiBursts, burst]

      const timer = window.setTimeout(() => {
        this.lockConfettiBursts = this.lockConfettiBursts.filter(item => item.id !== burst.id)
        this.lockConfettiTimers = this.lockConfettiTimers.filter(item => item !== timer)
      }, 920)

      this.lockConfettiTimers = [...this.lockConfettiTimers, timer]
    },
    openUploadPanel() {
      if (!this.canOpenUploadPanel) {
        return
      }

      this.isUploadOpen = true
    },
    closeUploadPanel() {
      this.isUploadOpen = false
      this.resetProofSubmitConfirm()
    },
    handleProofUpload(event) {
      const [file] = event.target.files || []

      if (!file) {
        return
      }

      if (this.proofPreviewUrl) {
        URL.revokeObjectURL(this.proofPreviewUrl)
      }

      this.selectedProofName = file.name
      this.proofPreviewUrl = URL.createObjectURL(file)
      this.resetProofSubmitConfirm()
    },
    submitProof() {
      if (!this.canSubmitProof) {
        return
      }

      if (!this.isProofSubmitConfirming) {
        this.startProofSubmitConfirm()
        return
      }

      this.$emit('submit-proof', {
        taskName: this.task.name,
        fileName: this.selectedProofName,
        recordType: this.isWeightChallenge ? this.proofRecordType : 'daily-proof',
        bmi: this.isWeightChallenge ? this.proofBmi : '',
        note: this.proofNote
      })
      this.resetProofForm()
      this.closeUploadPanel()
    },
    startProofSubmitConfirm() {
      this.isProofSubmitConfirming = true

      if (this.proofSubmitConfirmTimer) {
        window.clearTimeout(this.proofSubmitConfirmTimer)
      }

      this.proofSubmitConfirmTimer = window.setTimeout(() => {
        this.isProofSubmitConfirming = false
        this.proofSubmitConfirmTimer = null
      }, 1800)
    },
    resetProofSubmitConfirm() {
      this.isProofSubmitConfirming = false

      if (this.proofSubmitConfirmTimer) {
        window.clearTimeout(this.proofSubmitConfirmTimer)
        this.proofSubmitConfirmTimer = null
      }
    },
    resetProofForm() {
      if (this.proofPreviewUrl) {
        URL.revokeObjectURL(this.proofPreviewUrl)
      }

      this.proofNote = ''
      this.proofRecordType = 'month-start'
      this.proofBmi = ''
      this.proofPreviewUrl = ''
      this.selectedProofName = ''
      this.resetProofSubmitConfirm()

      if (this.$refs.proofFileInput) {
        this.$refs.proofFileInput.value = ''
      }
    },
    startUploadSwipe(event) {
      const [touch] = event.changedTouches

      if (!touch) {
        return
      }

      this.uploadTouchStartX = touch.clientX
      this.uploadTouchStartY = touch.clientY
    },
    finishUploadSwipe(event) {
      const [touch] = event.changedTouches

      if (!touch) {
        return
      }

      const deltaX = touch.clientX - this.uploadTouchStartX
      const deltaY = touch.clientY - this.uploadTouchStartY

      if (deltaX < -48 && Math.abs(deltaY) < 64) {
        this.closeUploadPanel()
      }
    }
  },
  beforeUnmount() {
    if (this.proofPreviewUrl) {
      URL.revokeObjectURL(this.proofPreviewUrl)
    }

    if (this.lockConfirmTimer) {
      window.clearTimeout(this.lockConfirmTimer)
    }

    if (this.proofSubmitConfirmTimer) {
      window.clearTimeout(this.proofSubmitConfirmTimer)
    }

    this.lockConfettiTimers.forEach(timer => window.clearTimeout(timer))
  },
  emits: ['lock-task', 'submit-proof']
}
</script>

<style scoped>
.project-detail {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-hero {
  position: relative;
  overflow: hidden;
  padding: 26px 24px;
  border-radius: 32px;
  background:
    radial-gradient(circle at 82% 28%, color-mix(in srgb, var(--accent), transparent 54%), transparent 28%),
    linear-gradient(135deg, #17211b, #263d2a);
  color: #fff;
  box-shadow: 0 22px 48px rgba(24, 38, 28, 0.2);
}

.detail-hero::after {
  position: absolute;
  right: -28px;
  bottom: -28px;
  width: 122px;
  height: 122px;
  border: 24px solid rgba(255, 255, 255, 0.08);
  border-radius: 50%;
  content: '';
}

.detail-eyebrow,
.section-label {
  color: #baf19d;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.detail-hero h1 {
  position: relative;
  z-index: 1;
  margin: 10px 0 8px;
  font-size: 32px;
  line-height: 1.05;
  letter-spacing: -0.04em;
}

.detail-hero p {
  position: relative;
  z-index: 1;
  max-width: 270px;
  margin: 0;
  color: rgba(255, 255, 255, 0.76);
  font-size: 14px;
  line-height: 1.7;
}

.detail-actions {
  position: relative;
  z-index: 1;
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 9px;
}

.lock-warning {
  max-width: 270px;
  padding: 7px 10px;
  border: 1px solid rgba(255, 184, 77, 0.28);
  border-radius: 999px;
  background: rgba(255, 184, 77, 0.12);
  color: rgba(255, 245, 224, 0.9);
  font-size: 11px;
  font-weight: 850;
  line-height: 1.35;
}

.lock-button {
  position: relative;
  z-index: 2;
  min-width: 142px;
  min-height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #fff, #dff9d4);
  color: #17211b;
  box-shadow:
    0 12px 24px rgba(0, 0, 0, 0.18),
    inset 0 -2px 0 rgba(23, 33, 27, 0.08);
  cursor: pointer;
  font-size: 14px;
  font-weight: 900;
  transform: translateY(0) scale(1);
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease,
    transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.lock-button:not(:disabled):hover {
  box-shadow:
    0 16px 28px rgba(0, 0, 0, 0.22),
    inset 0 -2px 0 rgba(23, 33, 27, 0.08);
  filter: brightness(1.03);
  transform: translateY(-2px) scale(1.01);
}

.lock-button:not(:disabled):active {
  box-shadow:
    0 6px 14px rgba(0, 0, 0, 0.2),
    inset 0 3px 8px rgba(23, 33, 27, 0.14);
  filter: brightness(0.98);
  transform: translateY(2px) scale(0.97);
  transition-duration: 0.08s;
}

.lock-button.is-confirming {
  background: linear-gradient(135deg, #ffb84d, #ff7a45);
  color: #fff;
  box-shadow:
    0 12px 24px rgba(255, 122, 69, 0.28),
    0 0 0 4px rgba(255, 184, 77, 0.18);
  animation: lock-confirm-pulse 1.1s ease-in-out infinite;
}

@keyframes lock-confirm-pulse {
  0%,
  100% {
    filter: brightness(1);
  }

  50% {
    filter: brightness(1.08);
  }
}

.lock-button-label {
  display: inline-block;
  min-width: 86px;
}

.lock-label-enter-active,
.lock-label-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.lock-label-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.96);
}

.lock-label-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}

.lock-button:focus-visible {
  outline: 3px solid rgba(186, 241, 157, 0.72);
  outline-offset: 3px;
}

.lock-button:disabled {
  cursor: not-allowed;
  opacity: 0.72;
  box-shadow: none;
  transform: none;
}

.lock-button.is-locked {
  background: color-mix(in srgb, var(--accent), #fff 28%);
  color: #fff;
}

.lock-button-stage {
  position: relative;
  display: inline-flex;
}

.lock-confetti-burst {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 50%;
  width: 1px;
  height: 1px;
  pointer-events: none;
}

.lock-confetti-piece {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--confetti-size);
  height: calc(var(--confetti-size) * 0.56);
  border-radius: 999px;
  background: var(--confetti-color);
  box-shadow: 0 0 10px color-mix(in srgb, var(--confetti-color), transparent 42%);
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.4);
  animation: lock-confetti-pop 820ms cubic-bezier(0.16, 0.9, 0.28, 1) forwards;
  animation-delay: var(--delay);
}

.lock-confetti-piece:nth-child(3n) {
  border-radius: 2px;
}

.lock-confetti-piece:nth-child(4n) {
  width: calc(var(--confetti-size) * 0.58);
  height: calc(var(--confetti-size) * 0.58);
}

@keyframes lock-confetti-pop {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.35) rotate(0deg);
  }

  18% {
    opacity: 1;
  }

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
      rotate(520deg);
  }
}

.lock-hint {
  color: rgba(255, 255, 255, 0.68);
  font-size: 12px;
  font-weight: 750;
}

.rules-card {
  padding: 18px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 14px 34px rgba(38, 64, 45, 0.08);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.rules-card .section-label {
  color: #2f8f32;
}

.rules-card h2 {
  margin: 8px 0 0;
  font-size: 17px;
  line-height: 1.35;
}

.rule-badge {
  flex-shrink: 0;
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(114, 216, 79, 0.18);
  color: #2f8f32;
  font-size: 12px;
  font-weight: 850;
}

.challenge-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.challenge-card {
  position: relative;
  min-height: 154px;
  overflow: hidden;
  padding: 18px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 30px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.72)),
    #fff;
  box-shadow: 0 16px 38px rgba(38, 64, 45, 0.09);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition:
    border-color 0.24s ease,
    box-shadow 0.24s ease,
    filter 0.24s ease,
    opacity 0.24s ease,
    transform 0.24s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.challenge-card.is-selected-level {
  border-color: color-mix(in srgb, var(--accent), #fff 12%);
  background:
    radial-gradient(circle at 92% 10%, color-mix(in srgb, var(--accent), transparent 68%), transparent 28%),
    linear-gradient(180deg, color-mix(in srgb, var(--accent), #fff 88%), rgba(255, 255, 255, 0.78)),
    #fff;
  box-shadow:
    0 20px 44px color-mix(in srgb, var(--accent), transparent 72%),
    inset 0 0 0 1px color-mix(in srgb, var(--accent), transparent 70%);
  transform: translateY(-1px);
}

.challenge-card.is-selected-level::before {
  position: absolute;
  z-index: 0;
  top: 0;
  bottom: 0;
  left: -42%;
  width: 34%;
  background: linear-gradient(
    105deg,
    transparent 0%,
    rgba(255, 255, 255, 0.08) 22%,
    rgba(255, 255, 255, 0.72) 48%,
    color-mix(in srgb, var(--accent), #fff 18%) 54%,
    rgba(255, 255, 255, 0.08) 78%,
    transparent 100%
  );
  content: '';
  opacity: 0.78;
  pointer-events: none;
  transform: skewX(-18deg) translateX(0);
  transform-origin: center;
  animation: selected-level-shine 2.4s ease-in-out infinite;
}

.challenge-card.is-selected-level::after {
  position: absolute;
  inset: 1px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 29px;
  content: '';
  pointer-events: none;
}

.challenge-card.is-dimmed-level {
  opacity: 0.46;
  filter: grayscale(0.28) saturate(0.72);
  box-shadow: 0 10px 24px rgba(38, 64, 45, 0.04);
}

@keyframes selected-level-shine {
  0% {
    transform: skewX(-18deg) translateX(0);
  }

  48%,
  100% {
    transform: skewX(-18deg) translateX(430%);
  }
}

.selected-level-badge {
  position: absolute;
  z-index: 2;
  top: 14px;
  right: 14px;
  padding: 6px 9px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent), #fff 22%);
  color: #fff;
  box-shadow: 0 10px 20px color-mix(in srgb, var(--accent), transparent 72%);
  font-size: 11px;
  font-weight: 950;
}

.challenge-card > * {
  position: relative;
  z-index: 1;
}

.challenge-header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.level-dot {
  width: 16px;
  height: 16px;
  margin-top: 3px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 7px color-mix(in srgb, var(--accent), transparent 78%);
}

.level-dot.bronze {
  background: #c47a36;
  box-shadow: 0 0 0 7px rgba(196, 122, 54, 0.16);
}

.level-dot.silver {
  background: #9aa3ad;
  box-shadow: 0 0 0 7px rgba(154, 163, 173, 0.16);
}

.level-dot.gold {
  background: #f1b82d;
  box-shadow: 0 0 0 7px rgba(241, 184, 45, 0.18);
}

.challenge-header strong {
  display: block;
  font-size: 17px;
  line-height: 1.2;
}

.challenge-header span:last-child {
  display: block;
  margin-top: 6px;
  color: #758078;
  font-size: 12px;
  line-height: 1.5;
}

.challenge-metrics {
  margin: 18px 0 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.metric-pill {
  min-height: 58px;
  padding: 10px 12px;
  border: 1px solid rgba(23, 33, 27, 0.06);
  border-radius: 18px;
  background: rgba(247, 250, 245, 0.78);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
}

.metric-pill span {
  color: #7a857d;
  font-size: 11px;
  font-weight: 750;
}

.metric-pill strong {
  color: #17211b;
  font-size: 16px;
  line-height: 1.1;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.challenge-footer {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.challenge-footer span {
  width: 100%;
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(23, 33, 27, 0.04);
  color: #3a463e;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.45;
}

.upload-fab {
  position: fixed;
  z-index: 5;
  right: max(24px, calc(50% - 190px));
  bottom: 104px;
  width: 56px;
  height: 56px;
  border: 0;
  border-radius: 22px;
  background: linear-gradient(135deg, #72d84f, #2f8f32);
  color: #fff;
  box-shadow: 0 18px 34px rgba(47, 143, 50, 0.34);
  cursor: pointer;
  font-size: 30px;
  line-height: 1;
}

.upload-fab:active {
  transform: translateY(2px) scale(0.96);
}

.upload-fab:disabled {
  background: linear-gradient(135deg, #d8ded9, #aeb8b0);
  color: rgba(255, 255, 255, 0.76);
  box-shadow: none;
  cursor: not-allowed;
  opacity: 0.78;
}

.upload-fab:disabled:active {
  transform: none;
}

.upload-overlay {
  --upload-safe-top: 92px;

  position: fixed;
  z-index: 20;
  top: var(--upload-safe-top);
  bottom: 0;
  left: 50%;
  width: min(100vw, 430px);
  transform: translateX(-50%);
  background: rgba(18, 27, 21, 0.22);
  backdrop-filter: blur(4px);
}

.upload-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  bottom: 88px;
  width: min(330px, calc(100% - 58px));
  padding: 16px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 30px;
  background:
    radial-gradient(circle at 86% 10%, color-mix(in srgb, var(--accent), transparent 76%), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 251, 244, 0.92));
  box-shadow: 0 26px 60px rgba(23, 33, 27, 0.26);
  color: #17211b;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  touch-action: pan-y;
}

.upload-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.upload-kicker {
  color: color-mix(in srgb, var(--accent), #17211b 22%);
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.16em;
}

.upload-panel-header h2 {
  margin: 5px 0 0;
  font-size: 20px;
  line-height: 1.12;
  letter-spacing: -0.04em;
}

.upload-close {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 14px;
  background: rgba(23, 33, 27, 0.06);
  color: #17211b;
  cursor: pointer;
  font-size: 23px;
  line-height: 1;
}

.upload-summary {
  padding: 10px 12px;
  border-radius: 18px;
  background: rgba(23, 33, 27, 0.04);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.upload-summary span {
  color: #758078;
  font-weight: 800;
}

.upload-summary strong {
  overflow: hidden;
  color: #17211b;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-form {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.upload-dropzone {
  position: relative;
  flex: 1;
  min-height: 128px;
  border: 1.5px dashed color-mix(in srgb, var(--accent), #fff 18%);
  border-radius: 24px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--accent), #fff 90%), rgba(255, 255, 255, 0.74)),
    #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  overflow: hidden;
  text-align: center;
}

.upload-dropzone input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.upload-icon {
  width: 48px;
  height: 48px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--accent), #fff 20%);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 30px;
  line-height: 1;
  box-shadow: 0 12px 24px color-mix(in srgb, var(--accent), transparent 72%);
}

.upload-dropzone strong {
  font-size: 15px;
  font-weight: 950;
}

.upload-dropzone small {
  max-width: 180px;
  color: #758078;
  font-size: 11px;
  font-weight: 750;
  line-height: 1.45;
}

.upload-dropzone.has-preview {
  border-style: solid;
  background: #17211b;
}

.upload-dropzone img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.replace-proof {
  position: absolute;
  right: 10px;
  bottom: 10px;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: #17211b;
  font-size: 11px;
  font-weight: 900;
}

.upload-form.is-weight-form {
  gap: 10px;
}

.upload-form.is-weight-form .upload-dropzone {
  min-height: 102px;
}

.weight-proof-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.record-type-toggle {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.record-type-toggle button {
  min-height: 54px;
  padding: 8px 10px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  color: #17211b;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 3px;
  text-align: left;
}

.record-type-toggle button.is-active {
  border-color: color-mix(in srgb, var(--accent), #fff 18%);
  background: color-mix(in srgb, var(--accent), #fff 82%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent), transparent 72%);
}

.record-type-toggle strong {
  font-size: 12px;
  font-weight: 950;
}

.record-type-toggle small {
  color: #6b776f;
  font-size: 10px;
  font-weight: 800;
}

.bmi-field {
  min-height: 46px;
  padding: 8px 10px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.76);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.bmi-field span {
  color: #4e5b53;
  font-size: 12px;
  font-weight: 950;
}

.bmi-field input {
  min-width: 0;
  border: 0;
  background: transparent;
  color: #17211b;
  font: inherit;
  font-size: 15px;
  font-weight: 850;
  outline: none;
}

.bmi-field input::placeholder {
  color: #9aa49d;
  font-weight: 750;
}

.proof-note {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.proof-note span {
  color: #4e5b53;
  font-size: 12px;
  font-weight: 900;
}

.proof-note textarea {
  width: 100%;
  height: clamp(64px, 12vh, 86px);
  padding: 11px 12px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  color: #17211b;
  font: inherit;
  font-size: 13px;
  line-height: 1.45;
  outline: none;
  resize: none;
}

.proof-note textarea:focus {
  border-color: color-mix(in srgb, var(--accent), #fff 18%);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent), transparent 82%);
}

.upload-form.is-weight-form .proof-note textarea {
  height: clamp(52px, 9vh, 66px);
}

.submit-proof {
  min-height: 46px;
  border: 0;
  border-radius: 18px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--accent), #fff 8%), #2f8f32);
  color: #fff;
  box-shadow: 0 14px 26px color-mix(in srgb, var(--accent), transparent 68%);
  cursor: pointer;
  font-size: 14px;
  font-weight: 950;
  transform: translateY(0) scale(1);
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease,
    transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.submit-proof:not(:disabled):hover {
  filter: brightness(1.03);
  transform: translateY(-2px) scale(1.01);
}

.submit-proof:not(:disabled):active {
  box-shadow:
    0 6px 12px color-mix(in srgb, var(--accent), transparent 76%),
    inset 0 3px 8px rgba(23, 33, 27, 0.2);
  filter: brightness(0.96);
  transform: translateY(2px) scale(0.96);
  transition-duration: 0.08s;
}

.submit-proof.is-confirming {
  background: linear-gradient(135deg, #ffb84d, #ff7a45);
  box-shadow:
    0 12px 24px rgba(255, 122, 69, 0.26),
    0 0 0 4px rgba(255, 184, 77, 0.18);
  animation: submit-proof-confirm-pulse 1.1s ease-in-out infinite;
}

@keyframes submit-proof-confirm-pulse {
  0%,
  100% {
    filter: brightness(1);
  }

  50% {
    filter: brightness(1.08);
  }
}

.submit-proof-label {
  display: inline-block;
  min-width: 58px;
}

.submit-proof-label-enter-active,
.submit-proof-label-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.submit-proof-label-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.96);
}

.submit-proof-label-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}

.submit-proof:disabled {
  background: rgba(23, 33, 27, 0.12);
  box-shadow: none;
  color: rgba(23, 33, 27, 0.38);
  cursor: not-allowed;
  transform: none;
}

.upload-panel-enter-active,
.upload-panel-leave-active {
  transition: opacity 0.26s ease;
}

.upload-panel-enter-active .upload-panel,
.upload-panel-leave-active .upload-panel {
  transition:
    opacity 0.26s ease,
    transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.upload-panel-enter-from,
.upload-panel-leave-to {
  opacity: 0;
}

.upload-panel-enter-from .upload-panel,
.upload-panel-leave-to .upload-panel {
  opacity: 0;
  transform: translateX(112%);
}

@media (max-height: 640px) {
  .upload-overlay {
    --upload-safe-top: 84px;
  }

  .upload-panel {
    top: 10px;
    bottom: 70px;
    gap: 9px;
    padding: 14px;
  }

  .upload-summary {
    padding: 8px 10px;
  }

  .upload-dropzone {
    min-height: 104px;
  }

  .upload-form.is-weight-form .upload-dropzone {
    min-height: 82px;
  }

  .record-type-toggle button {
    min-height: 48px;
  }

  .bmi-field {
    min-height: 42px;
  }

  .proof-note textarea {
    height: 58px;
  }

  .upload-form.is-weight-form .proof-note textarea {
    height: 46px;
  }

  .submit-proof {
    min-height: 42px;
  }
}
</style>
