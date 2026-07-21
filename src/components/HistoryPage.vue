<template>
  <PastSeasonReviewPage
    v-if="shouldShowPastSeasonOnly"
    :records="pastSeasonReviewRecords"
    :show-current-season-link="false"
  />

  <section v-else class="history-page" aria-label="当前赛季上传记录">
    <div class="history-hero">
      <span class="history-eyebrow">{{ heroEyebrow }}</span>
      <h1>{{ heroTitle }}</h1>
    </div>

    <section class="goal-progress-panel" aria-label="赛季目标进度">
      <div class="goal-progress-heading">
        <div>
          <span>赛季进度</span>
          <strong>{{ displayChallengeLevel }}</strong>
        </div>
        <em>目前进度为初审结果计算</em>
      </div>

      <div v-if="progressRows.length" class="goal-progress-list">
        <article
          v-for="row in progressRows"
          :key="row.taskName"
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

      <p v-else class="goal-progress-empty">选择 3 项运动并预订挑战等级后，这里会展示三项运动的进度。</p>
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

          <div class="history-list" v-if="sortedRecords.length">
            <article
              v-for="record in sortedRecords"
              :key="record.id"
              class="history-card"
              :style="{ '--accent': record.accent || '#72d84f' }"
            >
              <div class="record-date">
                <strong>{{ formatDay(record.uploadedAt) }}</strong>
                <span>{{ formatMonth(record.uploadedAt) }}</span>
              </div>

              <div class="record-body">
                <div class="record-header">
                  <div>
                    <strong>{{ record.taskName }}</strong>
                    <span>{{ recordTitle(record) }}</span>
                  </div>
                  <em>{{ formatTime(record.uploadedAt) }}</em>
                </div>

                <p v-if="record.note">{{ record.note }}</p>

                <div class="record-footer">
                  <span class="proof-file">{{ record.fileName }}</span>
                  <span class="proof-status" :class="`is-${reviewStatus(record)}`">
                    {{ reviewStatusText(record) }}
                  </span>
                </div>
              </div>
            </article>
          </div>

          <div v-else class="empty-history">
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
              <strong>{{ sortedPastSeasonReviewRecords.length ? `${sortedPastSeasonReviewRecords.length} 条已归档` : '暂无归档记录' }}</strong>
            </div>
            <button class="season-review-link is-return" type="button" @click="showCurrentSeasonRecords">
              <span aria-hidden="true">←</span>
              返回本赛季
            </button>
          </div>

          <div class="past-record-list" v-if="sortedPastSeasonReviewRecords.length">
            <article
              v-for="record in sortedPastSeasonReviewRecords"
              :key="record.id"
              class="past-record-card"
              :style="{ '--accent': record.accent || '#72d84f' }"
            >
              <div class="past-record-top">
                <div>
                  <span>{{ record.seasonName }}</span>
                  <strong>{{ record.taskName }}</strong>
                </div>
                <em :class="`is-${record.result}`">{{ resultText(record.result) }}</em>
              </div>

              <p v-if="record.note">{{ record.note }}</p>

              <dl class="past-record-meta">
                <div>
                  <dt>上传文件</dt>
                  <dd>{{ record.fileName }}</dd>
                </div>
                <div>
                  <dt>上传时间</dt>
                  <dd>{{ formatDateTime(record.uploadedAt) }}</dd>
                </div>
              </dl>
            </article>
          </div>

          <div v-else class="empty-history">
            <span>暂无过往赛季上传</span>
            <p>完成月末统一审核后，已归档的赛季记录会展示在这里。</p>
          </div>
        </section>
      </div>
    </section>
  </section>
</template>

<script>
import PastSeasonReviewPage from './PastSeasonReviewPage.vue'

const mockProgressByTaskName = {
  日常步数: 68,
  '跑步/快走': 42,
  健身打卡: 76,
  公司运动: 55,
  户外登山: 28,
  减重挑战: 50
}

const mockProgressFallbacks = [68, 42, 76]

const mockAccentFallbacks = ['#72d84f', '#20c7b5', '#ff9f45']

export default {
  name: 'HistoryPage',
  components: {
    PastSeasonReviewPage
  },
  data() {
    return {
      isShowingPastRecords: false
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
    lockedTaskNames: {
      type: Array,
      default: () => []
    },
    selectedChallengeLevel: {
      type: String,
      default: ''
    },
    seasonParticipationStatus: {
      type: String,
      default: 'unknown'
    }
  },
  computed: {
    shouldShowPastSeasonOnly() {
      return this.seasonParticipationStatus !== 'participated'
    },
    sortedRecords() {
      return [...this.records].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    },
    sortedPastSeasonReviewRecords() {
      return [...this.pastSeasonReviewRecords].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
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
    progressRows() {
      const taskNames = this.lockedTaskNames.length
        ? this.lockedTaskNames
        : ['日常步数', '公司运动', '减重挑战']

      return taskNames.map((taskName, index) => {
        const taskRecord = this.records.find(record => record.taskName === taskName)
        const percent = mockProgressByTaskName[taskName] ?? mockProgressFallbacks[index % mockProgressFallbacks.length]

        return {
          taskName,
          percent,
          accent: taskRecord?.accent || mockAccentFallbacks[index % mockAccentFallbacks.length]
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
    formatTime(value) {
      const date = new Date(value)
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
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
      const statusTextMap = {
        pending: '审核中',
        approved: '已通过',
        rejected: '未通过'
      }

      return statusTextMap[this.reviewStatus(record)] || '审核中'
    },
    resultText(result) {
      const resultMap = {
        approved: '已通过',
        rejected: '未通过',
        pending: '审核中',
        reviewed: '已审核'
      }

      return resultMap[result] || '已审核'
    },
    showPastSeasonRecords() {
      this.isShowingPastRecords = true
    },
    showCurrentSeasonRecords() {
      this.isShowingPastRecords = false
    }
  }
}
</script>

<style scoped>
.history-page {
  height: calc(100vh - 188px);
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
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 32px;
  background:
    radial-gradient(circle at 84% 18%, rgba(255, 159, 69, 0.32), transparent 27%),
    linear-gradient(140deg, rgba(255, 255, 255, 0.95), rgba(250, 244, 234, 0.88));
  box-shadow: 0 18px 44px rgba(89, 67, 47, 0.1);
}

.history-hero::after {
  position: absolute;
  right: -34px;
  bottom: -48px;
  width: 148px;
  height: 148px;
  border: 1px solid rgba(255, 159, 69, 0.22);
  border-radius: 50%;
  content: '';
}

.history-eyebrow {
  color: #d67624;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.16em;
}

.history-hero h1 {
  position: relative;
  z-index: 1;
  margin: 10px 0 8px;
  font-size: clamp(28px, 7.4vw, 34px);
  line-height: 1.08;
  letter-spacing: -0.04em;
}

.goal-progress-panel {
  flex-shrink: 0;
  padding: 16px 16px 15px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(248, 252, 247, 0.78)),
    rgba(255, 255, 255, 0.76);
  box-shadow: 0 14px 30px rgba(38, 64, 45, 0.06);
}

.goal-progress-heading,
.record-section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
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

.goal-progress-meta em {
  color: #607068;
  font-size: 11px;
  font-style: normal;
  font-weight: 950;
  line-height: 1.2;
  text-align: right;
}

.goal-progress-track {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(23, 33, 27, 0.07);
}

.goal-progress-track span {
  display: block;
  width: var(--progress);
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, color-mix(in srgb, var(--accent), #fff 30%), color-mix(in srgb, var(--accent), #20c7b5 18%));
  transition: width 0.28s ease;
}

.goal-progress-empty {
  margin: 12px 0 0;
  color: #68766d;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.6;
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
  box-shadow: 0 16px 34px rgba(38, 64, 45, 0.06);
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
  box-shadow: 0 16px 38px rgba(38, 64, 45, 0.08);
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 12px;
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
}

.record-body p {
  margin: 10px 0 0;
  color: #4a554e;
  font-size: 12px;
  line-height: 1.5;
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

.proof-status {
  flex-shrink: 0;
  padding: 5px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 950;
}

.proof-status.is-pending {
  background: rgba(255, 159, 69, 0.16);
  color: #d67624;
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
  flex-shrink: 0;
  padding: 16px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 255, 255, 0.72)),
    #fff;
  box-shadow: 0 16px 38px rgba(38, 64, 45, 0.08);
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
  padding: 5px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-style: normal;
  font-weight: 950;
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
</style>
