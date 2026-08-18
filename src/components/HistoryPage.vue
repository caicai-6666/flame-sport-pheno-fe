<template>
  <PastSeasonReviewPage
    v-if="shouldShowPastSeasonOnly"
    :records="pastSeasonReviewRecords"
    :supplement-records="supplementRecords"
    :is-supplement-records-loading="isSupplementRecordsLoading"
    :supplement-records-error="supplementRecordsError"
    :project-tasks="projectTasks"
    :is-season-write-frozen="isSeasonWriteFrozen"
    :hero-description="pastSeasonHeroDescription"
    :show-current-season-link="false"
    @supplement-submitted="$emit('supplement-submitted', $event)"
  />

  <section v-else class="history-page" aria-label="当前赛季上传记录">
    <div class="history-hero">
      <LiquidCardBackdrop variant="history" />
      <div
        class="history-hero-copy-frame"
        :class="{ 'is-showing-past': isShowingPastRecords }"
        aria-live="polite"
      >
        <Transition name="history-hero-copy">
          <div :key="isShowingPastRecords ? 'past' : 'current'" class="history-hero-content">
            <span class="history-eyebrow">{{ heroEyebrow }}</span>
            <h1>{{ heroTitle }}</h1>
          </div>
        </Transition>
      </div>
    </div>

    <section
      class="goal-progress-board"
      :class="{ 'is-showing-past': isShowingPastRecords }"
      aria-label="赛季进度与可补传记录"
    >
      <LiquidCardBackdrop variant="supplement" />
      <div class="goal-progress-board-inner">
        <section
          class="goal-progress-panel goal-progress-face is-current"
          aria-label="当前赛季目标进度"
          :aria-hidden="isShowingPastRecords"
          :inert="isShowingPastRecords"
        >
          <div class="goal-progress-heading">
            <div>
              <span>赛季进度</span>
              <strong>{{ displayChallengeLevel }}</strong>
            </div>
            <em>仅按初审通过记录计算</em>
          </div>

          <div v-if="progressRows.length" class="goal-progress-list">
            <article
              v-for="row in progressRows"
              :key="row.projectId"
              class="goal-progress-row"
              :style="{ '--progress': `${row.percent}%`, '--accent': row.accent }"
            >
              <div class="goal-progress-meta">
                <strong>{{ row.taskName }}</strong>
                <div class="goal-progress-track" aria-hidden="true">
                  <span></span>
                </div>
                <em>{{ row.percent }}%</em>
              </div>
            </article>
          </div>

          <p v-else class="goal-progress-empty">{{ progressEmptyText }}</p>
        </section>

        <section
          class="goal-progress-panel goal-progress-face is-supplement"
          :aria-hidden="!isShowingPastRecords"
          :inert="!isShowingPastRecords"
        >
          <span class="supplement-summary-copy">
            <span>可补传记录</span>
            <strong>{{ supplementSummary }}</strong>
          </span>
        </section>
      </div>
    </section>

    <section class="record-board" :class="{ 'is-showing-past': isShowingPastRecords }" aria-label="上传记录看板">
      <div class="record-board-inner">
        <section
          class="record-section record-board-face is-current"
          aria-label="本赛季上传记录"
          :aria-hidden="isShowingPastRecords"
          :inert="isShowingPastRecords"
        >
          <div class="record-section-heading">
            <div>
              <span>上传记录</span>
              <strong>{{ sortedRecords.length ? `${sortedRecords.length} 条本赛季记录` : '暂无本赛季记录' }}</strong>
            </div>
            <button class="season-review-link" type="button" @click="showPastSeasonRecords">
              过往赛季上传记录
              <span aria-hidden="true">→</span>
            </button>
          </div>

          <div class="history-list" v-if="!isShowingPastRecords && sortedRecords.length">
            <div
              v-for="record in sortedRecords"
              :key="record.id"
              class="history-card-entry"
            >
              <article
              class="history-card"
              :class="{ 'is-previewable': canPreviewProof(record) }"
              :style="{ '--accent': record.accent || '#72d84f' }"
              :role="canPreviewProof(record) ? 'button' : undefined"
              :tabindex="canPreviewProof(record) ? 0 : undefined"
              @click="openProofImage(record)"
              @keydown.enter.prevent="openProofImage(record)"
              @keydown.space.prevent="openProofImage(record)"
            >
              <div class="record-date">
                <strong>{{ formatDay(record.proofDate || record.uploadedAt) }}</strong>
                <span>{{ formatMonth(record.proofDate || record.uploadedAt) }}</span>
              </div>

              <div class="record-body">
                <div class="record-header">
                  <div>
                    <strong>{{ record.taskName }}</strong>
                    <span>{{ recordTitle(record) }}</span>
                  </div>
                  <em>{{ formatDateTime(record.uploadedAt) }}</em>
                </div>

                <p v-if="record.note">{{ record.note }}</p>
                <p v-if="record.reviewComment" class="review-comment">
                  <span>审核意见</span>
                  {{ record.reviewComment }}
                </p>

                <div class="record-footer">
                  <span class="proof-file">{{ record.fileName }}<em v-if="canPreviewProof(record)"> · 点击查看原图</em></span>
                  <span class="proof-status" :class="`is-${reviewStatus(record)}`">
                    {{ reviewStatusText(record) }}
                  </span>
                </div>
              </div>
              </article>
            </div>
          </div>

          <div v-else-if="!isShowingPastRecords" class="empty-history">
            <span>暂无记录</span>
            <p>锁定运动并完成上传后，会在这里看到当前赛季的上传历史。</p>
          </div>
        </section>

        <section
          class="record-section record-board-face is-past"
          aria-label="过往赛季上传记录"
          :aria-hidden="!isShowingPastRecords"
          :inert="!isShowingPastRecords"
        >
          <div class="record-section-heading">
            <div>
              <span>过往上传</span>
              <strong>{{ pastRecordSummary }}</strong>
            </div>
            <button class="season-review-link is-return" type="button" @click="showCurrentSeasonRecords">
              <span aria-hidden="true">←</span>
              返回本赛季
            </button>
          </div>

          <div class="past-record-list" v-if="isShowingPastRecords && displayedPastRecords.length">
            <div
              v-for="record in displayedPastRecords"
              :key="record.id"
              class="past-record-card-entry"
            >
              <SupplementRecordCard
                v-if="record.isSupplementEligible"
                :record="record"
                :project-tasks="projectTasks"
                :is-write-frozen="isSeasonWriteFrozen"
                @preview="openProofImage"
                @submitted="$emit('supplement-submitted', $event)"
              />
              <article
                v-else
                class="past-record-card"
                :class="{ 'is-previewable': canPreviewProof(record) }"
                :style="{ '--accent': record.accent || '#72d84f' }"
                :role="canPreviewProof(record) ? 'button' : undefined"
                :tabindex="canPreviewProof(record) ? 0 : undefined"
                @click="openProofImage(record)"
                @keydown.enter.prevent="openProofImage(record)"
                @keydown.space.prevent="openProofImage(record)"
              >
                <div class="past-record-top">
                  <div>
                    <span>{{ record.seasonName }}</span>
                    <strong>{{ record.taskName }}</strong>
                  </div>
                  <em :class="`is-${record.result}`">{{ resultText(record.result) }}</em>
                </div>

                <p v-if="record.note">{{ record.note }}</p>
                <p v-if="record.reviewComment" class="past-review-comment">
                  <span>审核意见</span>
                  {{ record.reviewComment }}
                </p>

                <dl class="past-record-meta">
                  <div>
                    <dt>上传文件</dt>
                    <dd>{{ record.fileName }}<em v-if="canPreviewProof(record)"> · 点击查看原图</em></dd>
                  </div>
                  <div>
                    <dt>上传时间</dt>
                    <dd>{{ formatDateTime(record.uploadedAt) }}</dd>
                  </div>
                </dl>
              </article>
            </div>
          </div>

          <div v-else-if="isShowingPastRecords" class="empty-history">
            <span>暂无过往赛季上传</span>
            <p>完成月末统一审核后，已归档的赛季记录会展示在这里。</p>
          </div>
        </section>
      </div>
    </section>

    <ProofImageViewer
      v-if="previewRecord"
      :image-url="previewRecord.imageUrl"
      :image-blob="previewRecord.temporaryImageBlob"
      :file-name="previewRecord.fileName"
      @close="closeProofImage"
    />
  </section>
</template>

<script>
import LiquidCardBackdrop from './LiquidCardBackdrop.vue'
import PastSeasonReviewPage from './PastSeasonReviewPage.vue'
import ProofImageViewer from './ProofImageViewer.vue'
import SupplementRecordCard from './SupplementRecordCard.vue'
import { prioritizeSupplementRecords } from '../utils/historyRecords'
import { getReviewStatusText } from '../utils/proofReview'

export default {
  name: 'HistoryPage',
  emits: ['supplement-submitted'],
  components: {
    LiquidCardBackdrop,
    PastSeasonReviewPage,
    ProofImageViewer,
    SupplementRecordCard
  },
  data() {
    return {
      isShowingPastRecords: false,
      displayedProgressByProjectId: {},
      hasPlayedProgressAnimation: false,
      progressAnimationFrame: null,
      previewRecord: null
    }
  },
  props: {
    records: {
      type: Array,
      default: () => []
    },
    pastSeasonReviewRecords: {
      type: Array,
      default: () => []
    },
    supplementRecords: {
      type: Array,
      default: () => []
    },
    isSupplementRecordsLoading: {
      type: Boolean,
      default: false
    },
    supplementRecordsError: {
      type: String,
      default: ''
    },
    projectProgressRecords: {
      type: Array,
      default: () => []
    },
    projectTasks: {
      type: Array,
      default: () => []
    },
    isProjectProgressLoading: {
      type: Boolean,
      default: false
    },
    projectProgressError: {
      type: String,
      default: ''
    },
    selectedChallengeLevel: {
      type: String,
      default: ''
    },
    seasonParticipationStatus: {
      type: String,
      default: 'unknown'
    },
    isNoActiveSeason: {
      type: Boolean,
      default: false
    },
    isSeasonWriteFrozen: {
      type: Boolean,
      default: false
    }
  },
  watch: {
    projectProgressRecords() {
      this.animateProjectProgress()
    }
  },
  computed: {
    shouldShowPastSeasonOnly() {
      return this.seasonParticipationStatus !== 'participated'
    },
    pastSeasonHeroDescription() {
      return this.isNoActiveSeason
        ? '当前暂无进行中的赛季，敬请期待。你仍可查看已归档的上传记录与审核结果。'
        : '查看已归档赛季的上传记录与审核结果。'
    },
    sortedRecords() {
      return [...this.records].sort((a, b) => new Date(b.proofDate || b.uploadedAt) - new Date(a.proofDate || a.uploadedAt))
    },
    sortedPastSeasonReviewRecords() {
      return [...this.pastSeasonReviewRecords].sort((a, b) => new Date(b.proofDate || b.uploadedAt) - new Date(a.proofDate || a.uploadedAt))
    },
    sortedSupplementRecords() {
      // 后端已按赛季、运动日期、上传时间和凭证 ID 排序，前端保持其资格优先级。
      return this.supplementRecords.map(record => ({
        ...record,
        isSupplementEligible: true
      }))
    },
    prioritizedPastRecords() {
      return prioritizeSupplementRecords(this.sortedPastSeasonReviewRecords, this.sortedSupplementRecords)
    },
    displayedPastRecords() {
      return this.prioritizedPastRecords
    },
    supplementSummary() {
      if (this.isSupplementRecordsLoading) {
        return '正在查询…'
      }

      if (this.supplementRecordsError) {
        return '暂时无法获取'
      }

      return this.sortedSupplementRecords.length
        ? `${this.sortedSupplementRecords.length} 条可补传`
        : '当前无可补传记录'
    },
    pastRecordSummary() {
      return this.displayedPastRecords.length
        ? `${this.displayedPastRecords.length} 条已归档`
        : '暂无归档记录'
    },
    heroEyebrow() {
      return this.isShowingPastRecords ? 'PAST SEASONS' : 'CURRENT SEASON'
    },
    heroTitle() {
      return this.isShowingPastRecords ? '过往赛季上传记录' : '本赛季上传历史'
    },
    displayChallengeLevel() {
      return this.selectedChallengeLevel || '白银挑战'
    },
    progressEmptyText() {
      if (this.isProjectProgressLoading) {
        return '正在加载本赛季项目进度…'
      }

      return this.projectProgressError || '暂无本赛季项目进度'
    },
    progressRows() {
      return this.projectProgressRecords.map(progressRecord => {
        const task = this.projectTasks.find(item => String(item.projectId) === String(progressRecord.projectId))
        const taskRecord = this.records.find(record => String(record.projectId) === String(progressRecord.projectId))
        const projectId = String(progressRecord.projectId)
        const displayedPercent = this.displayedProgressByProjectId[projectId]

        return {
          projectId,
          taskName: task?.name || `项目 ${progressRecord.projectId}`,
          percent: Number.isFinite(displayedPercent) ? displayedPercent : 0,
          accent: task?.accent || taskRecord?.accent || '#72d84f'
        }
      })
    }
  },
  methods: {
    formatMonth(value) {
      const date = new Date(value)
      return `${date.getMonth() + 1}月`
    },
    formatDay(value) {
      const date = new Date(value)
      return `${date.getDate()}日`
    },
    formatDateTime(value) {
      const date = new Date(value)

      if (Number.isNaN(date.getTime())) {
        return '--'
      }

      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')

      return `${date.getFullYear()}.${month}.${day} ${hour}:${minute}`
    },
    recordTitle(record) {
      if (record.taskName !== '减重挑战') {
        return '运动上传'
      }

      const typeText = record.recordType === 'month-end' ? '月末体重' : '月初体重'
      return record.bmi ? `${typeText} · BMI ${record.bmi}` : typeText
    },
    reviewStatus(record) {
      return record.reviewStatus || 'pending'
    },
    reviewStatusText(record) {
      return getReviewStatusText(this.reviewStatus(record))
    },
    resultText(result) {
      return getReviewStatusText(result)
    },
    openProofImage(record) {
      if (this.canPreviewProof(record)) {
        this.previewRecord = record
      }
    },
    canPreviewProof(record) {
      return Boolean(record?.imageUrl || record?.temporaryImageBlob?.size)
    },
    closeProofImage() {
      this.previewRecord = null
    },
    animateProjectProgress() {
      if (this.progressAnimationFrame) {
        window.cancelAnimationFrame(this.progressAnimationFrame)
        this.progressAnimationFrame = null
      }

      const targetProgressByProjectId = this.projectProgressRecords.reduce((targets, record) => {
        targets[String(record.projectId)] = Math.round(record.completionProgress * 100)
        return targets
      }, {})
      const projectIds = Object.keys(targetProgressByProjectId)

      if (!projectIds.length) {
        this.displayedProgressByProjectId = {}
        return
      }

      const shouldReduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

      if (this.hasPlayedProgressAnimation || shouldReduceMotion) {
        this.displayedProgressByProjectId = targetProgressByProjectId
        return
      }

      // 仅在历史页首次得到真实进度时播放，KeepAlive 切回页面不会重复从 0 开始。
      this.hasPlayedProgressAnimation = true
      this.displayedProgressByProjectId = Object.fromEntries(projectIds.map(projectId => [projectId, 0]))

      const duration = 780
      const startedAt = performance.now()
      const easeOut = progress => 1 - Math.pow(1 - progress, 3)
      const step = now => {
        const progress = Math.min((now - startedAt) / duration, 1)
        const easedProgress = easeOut(progress)

        this.displayedProgressByProjectId = Object.fromEntries(projectIds.map(projectId => [
          projectId,
          Math.round(targetProgressByProjectId[projectId] * easedProgress)
        ]))

        if (progress < 1) {
          this.progressAnimationFrame = window.requestAnimationFrame(step)
          return
        }

        this.displayedProgressByProjectId = targetProgressByProjectId
        this.progressAnimationFrame = null
      }

      this.progressAnimationFrame = window.requestAnimationFrame(step)
    },
    showPastSeasonRecords() {
      this.isShowingPastRecords = true
    },
    showCurrentSeasonRecords() {
      this.isShowingPastRecords = false
    }
  },
  beforeUnmount() {
    if (this.progressAnimationFrame) {
      window.cancelAnimationFrame(this.progressAnimationFrame)
    }

    this.closeProofImage()
  }
}
</script>

<style scoped>
.history-page {
  height: calc(100vh - 188px);
  height: calc(100vh - 172px - env(safe-area-inset-top) - max(8px, env(safe-area-inset-bottom)));
  height: calc(100dvh - 172px - env(safe-area-inset-top) - max(8px, env(safe-area-inset-bottom)));
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.history-hero {
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  padding: 24px;
  border: 0;
  border-radius: 32px;
  background: linear-gradient(140deg, #211006, #713415);
  box-shadow:
    0 2px 5px rgba(55, 24, 7, 0.1),
    0 10px 24px rgba(55, 24, 7, 0.21);
}

.history-hero-copy-frame {
  position: relative;
  z-index: 2;
  display: grid;
}

.history-hero-content {
  grid-area: 1 / 1;
  min-width: 0;
}

.history-hero-copy-enter-active,
.history-hero-copy-leave-active {
  transition:
    opacity 0.38s ease,
    transform 0.46s cubic-bezier(0.2, 0.82, 0.2, 1);
}

.history-hero-copy-frame.is-showing-past .history-hero-copy-enter-from,
.history-hero-copy-frame:not(.is-showing-past) .history-hero-copy-leave-to {
  opacity: 0;
  transform: translateX(112%);
}

.history-hero-copy-frame.is-showing-past .history-hero-copy-leave-to,
.history-hero-copy-frame:not(.is-showing-past) .history-hero-copy-enter-from {
  opacity: 0;
  transform: translateX(-112%);
}

.history-eyebrow {
  color: #ffd28a;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.16em;
  text-shadow: 0 0 18px rgba(255, 160, 68, 0.5);
}

.history-hero h1 {
  position: relative;
  z-index: 1;
  margin: 10px 0 8px;
  color: #fff;
  font-size: clamp(28px, 7.4vw, 34px);
  line-height: 1.08;
  letter-spacing: -0.04em;
}

@media (prefers-reduced-motion: reduce) {
  .history-hero-copy-enter-active,
  .history-hero-copy-leave-active {
    transition: none;
  }
}

.goal-progress-panel {
  flex-shrink: 0;
  padding: 16px 16px 15px;
  border: 0;
  border-radius: 28px;
  background: transparent;
}

.goal-progress-board {
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  border-radius: 28px;
  background:
    radial-gradient(circle at 82% 18%, rgba(255, 112, 67, 0.46), transparent 34%),
    linear-gradient(138deg, #160d2e, #54216f 58%, #28103d);
  box-shadow:
    0 2px 5px rgba(49, 18, 76, 0.07),
    0 9px 22px rgba(49, 18, 76, 0.16);
}

.goal-progress-board-inner {
  position: relative;
  z-index: 1;
  display: grid;
}

.goal-progress-face {
  grid-area: 1 / 1;
  min-width: 0;
  width: 100%;
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 0.38s ease,
    transform 0.46s cubic-bezier(0.2, 0.82, 0.2, 1);
}

.goal-progress-face.is-current {
  opacity: 1;
  transform: translateX(0);
}

.goal-progress-face.is-supplement {
  box-sizing: border-box;
  transform: translateX(112%);
}

/* 卡片与液体背景保持原位，只让内容按当前、过往页面的方向滑动。 */
.goal-progress-board.is-showing-past .goal-progress-face.is-current {
  opacity: 0;
  transform: translateX(-112%);
}

.goal-progress-board.is-showing-past .goal-progress-face.is-supplement {
  opacity: 1;
  transform: translateX(0);
}

.goal-progress-board:not(.is-showing-past) .goal-progress-face.is-current {
  pointer-events: auto;
}

.goal-progress-board.is-showing-past .goal-progress-face.is-supplement {
  pointer-events: auto;
}

.goal-progress-heading,
.record-section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.goal-progress-heading,
.goal-progress-list,
.goal-progress-empty {
  position: relative;
  z-index: 2;
}

.goal-progress-heading span,
.record-section-heading span {
  color: #758078;
}

.goal-progress-heading strong,
.record-section-heading strong {
  display: block;
  margin-top: 4px;
  color: #17211b;
  font-size: 16px;
  font-weight: 950;
  line-height: 1.1;
}

.goal-progress-heading em {
  flex-shrink: 0;
  max-width: 128px;
  color: #8b958e;
  font-size: 11px;
  font-style: normal;
  font-weight: 850;
  line-height: 1.35;
  text-align: right;
}

.goal-progress-face.is-current .goal-progress-heading span {
  color: rgba(255, 239, 194, 0.76);
}

.goal-progress-face.is-current .goal-progress-heading strong {
  color: #fff;
}

.goal-progress-face.is-current .goal-progress-heading em {
  color: rgba(255, 255, 255, 0.68);
}

.goal-progress-face.is-supplement {
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: default;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.supplement-summary-copy > span {
  position: relative;
  z-index: 2;
  color: rgba(255, 239, 194, 0.76);
  font-size: 12px;
  font-weight: 850;
}

.supplement-summary-copy > strong {
  position: relative;
  z-index: 2;
  display: block;
  margin-top: 6px;
  color: #fff;
  font-size: 20px;
  font-weight: 950;
  line-height: 1.1;
}

.goal-progress-list {
  margin-top: 15px;
  display: grid;
  gap: 12px;
}

.goal-progress-row {
  min-width: 0;
}

.goal-progress-meta {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(58px, 78px) minmax(0, 1fr) 38px;
  align-items: center;
  gap: 10px;
}

.goal-progress-meta strong {
  overflow: hidden;
  color: #17211b;
  font-size: 12px;
  font-weight: 950;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.goal-progress-face.is-current .goal-progress-meta strong {
  color: #fff;
  text-shadow: 0 1px 10px rgba(22, 13, 46, 0.42);
}

.goal-progress-meta em {
  color: #607068;
  font-size: 11px;
  font-style: normal;
  font-weight: 950;
  line-height: 1.2;
  text-align: right;
}

.goal-progress-face.is-current .goal-progress-meta em {
  color: #ffdf9c;
  text-shadow: 0 1px 10px rgba(22, 13, 46, 0.42);
}

.goal-progress-track {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(23, 33, 27, 0.07);
}

.goal-progress-face.is-current .goal-progress-track {
  background: rgba(255, 255, 255, 0.18);
  box-shadow: inset 0 1px 3px rgba(22, 13, 46, 0.28);
}

.goal-progress-track span {
  display: block;
  width: var(--progress);
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
  background: linear-gradient(90deg, color-mix(in srgb, var(--accent), #fff 30%), color-mix(in srgb, var(--accent), #20c7b5 18%));
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent), transparent 42%);
}

.goal-progress-empty {
  margin: 12px 0 0;
  color: #68766d;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.6;
}

.goal-progress-face.is-current .goal-progress-empty {
  color: rgba(255, 255, 255, 0.74);
}

.record-board {
  min-height: 0;
  flex: 1;
  perspective: 1200px;
}

.record-board-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.68s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.record-board.is-showing-past .record-board-inner {
  transform: rotateY(-180deg);
}

.record-board-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  pointer-events: none;
}

.record-board-face.is-past {
  transform: rotateY(180deg);
}

.record-board:not(.is-showing-past) .record-board-face.is-current,
.record-board.is-showing-past .record-board-face.is-past {
  pointer-events: auto;
}

.record-section {
  min-height: 0;
  padding: 14px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.58);
  box-shadow:
    0 2px 5px rgba(38, 64, 45, 0.04),
    0 9px 22px rgba(38, 64, 45, 0.1);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-section-heading {
  flex-shrink: 0;
}

.record-section-heading strong {
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(255, 159, 69, 0.14);
  color: #d67624;
  font-size: 11px;
}

.season-review-link {
  flex-shrink: 0;
  padding: 7px 10px;
  border: 0;
  border-radius: 999px;
  background: rgba(114, 216, 79, 0.16);
  color: #2f8f32;
  font-size: 11px;
  font-weight: 950;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  box-shadow: inset 0 0 0 1px rgba(47, 143, 50, 0.1);
}

.season-review-link:hover {
  background: rgba(114, 216, 79, 0.24);
}

.season-review-link:active {
  transform: translateY(1px);
}

.season-review-link:focus-visible {
  outline: 3px solid rgba(114, 216, 79, 0.32);
  outline-offset: 2px;
}

.season-review-link.is-return {
  background: rgba(23, 33, 27, 0.08);
  color: #17211b;
  box-shadow: none;
}

.season-review-link.is-return:hover {
  background: rgba(23, 33, 27, 0.12);
}

.history-list,
.past-record-list {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
}

.history-list::-webkit-scrollbar,
.past-record-list::-webkit-scrollbar {
  width: 4px;
}

.history-list::-webkit-scrollbar-thumb,
.past-record-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(23, 33, 27, 0.14);
}

.history-card {
  position: relative;
  flex-shrink: 0;
  min-height: 112px;
  padding: 14px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.72)),
    #fff;
  box-shadow:
    0 2px 5px rgba(38, 64, 45, 0.05),
    0 10px 24px rgba(38, 64, 45, 0.12);
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 12px;
}

.history-card-entry,
.past-record-card-entry {
  flex-shrink: 0;
}

.history-card.is-previewable,
.past-record-card.is-previewable {
  cursor: pointer;
  border-color: color-mix(in srgb, var(--accent), #fff 72%);
  box-shadow:
    0 3px 0 color-mix(in srgb, var(--accent), #fff 80%),
    0 16px 38px rgba(38, 64, 45, 0.08);
  transition: transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 160ms ease, border-color 160ms ease;
}

.history-card.is-previewable:hover,
.past-record-card.is-previewable:hover {
  border-color: color-mix(in srgb, var(--accent), #fff 48%);
  box-shadow:
    0 5px 0 color-mix(in srgb, var(--accent), #fff 80%),
    0 22px 42px rgba(38, 64, 45, 0.14);
  transform: translateY(-3px);
}

.history-card.is-previewable:active,
.past-record-card.is-previewable:active {
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--accent), #fff 82%),
    0 8px 18px rgba(38, 64, 45, 0.1);
  transform: translateY(2px) scale(0.988);
}

.history-card.is-previewable:focus-visible,
.past-record-card.is-previewable:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--accent), #fff 42%);
  outline-offset: 3px;
}

.history-card::before {
  position: absolute;
  inset: 14px auto 14px 74px;
  width: 2px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent), transparent 62%);
  content: '';
}

.record-date {
  width: 54px;
  height: 54px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--accent), #fff 78%);
  color: color-mix(in srgb, var(--accent), #111 25%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.record-date strong {
  font-size: 15px;
  font-weight: 950;
  line-height: 1;
}

.record-date span {
  margin-top: 4px;
  font-size: 11px;
  font-weight: 850;
}

.record-body {
  min-width: 0;
}

.record-header {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.record-header strong {
  display: block;
  color: #17211b;
  font-size: 16px;
  font-weight: 950;
  line-height: 1.2;
}

.record-header span {
  display: block;
  margin-top: 4px;
  color: #77827b;
  font-size: 11px;
  font-weight: 800;
}

.record-header em {
  flex-shrink: 0;
  color: #8f9992;
  font-size: 11px;
  font-style: normal;
  font-weight: 850;
  white-space: nowrap;
}

.record-body p {
  margin: 10px 0 0;
  color: #4a554e;
  font-size: 12px;
  line-height: 1.5;
}

.record-body .review-comment {
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(47, 143, 50, 0.07);
  color: #496050;
}

.review-comment span {
  margin-right: 6px;
  color: #2f8f32;
  font-size: 11px;
  font-weight: 950;
}

.record-footer {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.proof-file {
  min-width: 0;
  overflow: hidden;
  color: #77827b;
  font-size: 11px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proof-file em,
.past-record-meta dd em {
  color: #2f8f32;
  font-style: normal;
  font-weight: 950;
}

.proof-status {
  flex-shrink: 0;
  box-sizing: border-box;
  width: 68px;
  height: 26px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 950;
  line-height: 1;
}

.proof-status.is-pending {
  background: rgba(255, 159, 69, 0.16);
  color: #d67624;
}

.proof-status.is-preliminary_approved {
  background: rgba(79, 156, 255, 0.15);
  color: #3375c4;
}

.proof-status.is-preliminary_rejected {
  background: rgba(255, 111, 145, 0.14);
  color: #c94668;
}

.proof-status.is-approved {
  background: rgba(114, 216, 79, 0.16);
  color: #2f8f32;
}

.proof-status.is-rejected {
  background: rgba(255, 111, 145, 0.14);
  color: #c94668;
}

.past-record-card {
  position: relative;
  flex-shrink: 0;
  padding: 16px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.72)),
    #fff;
  box-shadow:
    0 2px 5px rgba(38, 64, 45, 0.05),
    0 10px 24px rgba(38, 64, 45, 0.12);
}

.past-record-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.past-record-top span {
  display: block;
  color: #77827b;
  font-size: 11px;
  font-weight: 850;
}

.past-record-top strong {
  display: block;
  margin-top: 5px;
  color: #17211b;
  font-size: 17px;
  font-weight: 950;
  line-height: 1.2;
}

.past-record-top em {
  flex-shrink: 0;
  box-sizing: border-box;
  width: 68px;
  height: 26px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-style: normal;
  font-weight: 950;
  line-height: 1;
}

.past-record-top em.is-approved {
  background: rgba(114, 216, 79, 0.16);
  color: #2f8f32;
}

.past-record-top em.is-rejected {
  background: rgba(255, 111, 145, 0.16);
  color: #c93c62;
}

.past-record-top em.is-pending {
  background: rgba(255, 159, 69, 0.16);
  color: #d67624;
}

.past-record-top em.is-preliminary_approved {
  background: rgba(79, 156, 255, 0.15);
  color: #3375c4;
}

.past-record-top em.is-preliminary_rejected {
  background: rgba(255, 111, 145, 0.16);
  color: #c93c62;
}

.past-record-top em.is-reviewed {
  background: rgba(23, 33, 27, 0.08);
  color: #5f6b64;
}

.past-record-card p {
  margin: 12px 0 0;
  color: #4a554e;
  font-size: 12px;
  line-height: 1.55;
}

.past-record-card .past-review-comment {
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(255, 159, 69, 0.09);
  color: #70513b;
}

.past-review-comment span {
  margin-right: 6px;
  color: #c65f1b;
  font-size: 11px;
  font-weight: 950;
}

.past-record-meta {
  margin: 14px 0 0;
  display: grid;
  gap: 8px;
}

.past-record-meta div {
  min-width: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.past-record-meta dt {
  flex-shrink: 0;
  color: #8b958e;
  font-size: 11px;
  font-weight: 850;
}

.past-record-meta dd {
  min-width: 0;
  overflow: hidden;
  margin: 0;
  color: #17211b;
  font-size: 12px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-history {
  min-height: 0;
  padding: 28px 22px;
  border: 1px dashed rgba(23, 33, 27, 0.14);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.64);
  color: #68766d;
  display: grid;
  flex: 1;
  place-items: center;
  text-align: center;
}

.empty-history span {
  color: #17211b;
  font-size: 18px;
  font-weight: 950;
}

.empty-history p {
  max-width: 260px;
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.65;
}

@media (prefers-reduced-motion: reduce) {
  .goal-progress-face {
    transition: none;
  }

  .goal-progress-track span {
    transition: none;
  }
}
</style>
