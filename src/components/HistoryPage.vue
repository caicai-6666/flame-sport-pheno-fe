<template>
  <section class="history-page" aria-label="当前赛季上传记录">
    <div class="history-hero">
      <span class="history-eyebrow">CURRENT SEASON</span>
      <h1>本赛季上传历史</h1>
    </div>

    <section class="goal-progress-panel" aria-label="目标等级完成度">
      <div class="goal-progress-heading">
        <div>
          <span>目标完成度</span>
          <strong>{{ selectedChallengeLevel || '未选择等级' }}</strong>
        </div>
        <em>仅统计已通过记录</em>
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
            <span>{{ row.approvedCount }}/{{ row.targetCount }} 次</span>
          </div>
          <div class="goal-progress-track" aria-hidden="true">
            <span></span>
          </div>
        </article>
      </div>

      <p v-else class="goal-progress-empty">选择 3 项运动并预订挑战等级后，这里会展示三项运动的完成度。</p>
    </section>

    <section class="record-section" aria-label="凭证记录列表">
      <div class="record-section-heading">
        <span>凭证记录</span>
        <button class="season-review-link" type="button" @click="openPastSeasonReviews">
          过往赛季审核记录
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
        <p>锁定运动并上传凭证后，会在这里看到当前赛季的上传历史。</p>
      </div>
    </section>
  </section>
</template>

<script>
const targetCountByLevel = {
  青铜: 5,
  白银: 8,
  黄金: 12
}

export default {
  name: 'HistoryPage',
  props: {
    records: {
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
    }
  },
  computed: {
    sortedRecords() {
      return [...this.records].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    },
    approvedRecords() {
      return this.records.filter(record => this.reviewStatus(record) === 'approved')
    },
    progressRows() {
      if (!this.lockedTaskNames.length || !this.selectedChallengeLevel) {
        return []
      }

      const targetCount = targetCountByLevel[this.selectedChallengeLevel] || targetCountByLevel.青铜

      return this.lockedTaskNames.map(taskName => {
        const approvedCount = this.approvedRecords.filter(record => record.taskName === taskName).length
        const taskRecord = this.records.find(record => record.taskName === taskName)
        const percent = Math.min(Math.round((approvedCount / targetCount) * 100), 100)

        return {
          taskName,
          approvedCount,
          targetCount,
          percent,
          accent: taskRecord?.accent || '#72d84f'
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
    recordTitle(record) {
      if (record.taskName !== '减重挑战') {
        return '运动凭证'
      }

      const typeText = record.recordType === 'month-end' ? '月末体重' : '月初体重'
      return record.bmi ? `${typeText} · BMI ${record.bmi}` : typeText
    },
    reviewStatus() {
      return 'pending'
    },
    reviewStatusText() {
      return '审核中'
    },
    openPastSeasonReviews() {
      this.$router.push({ name: 'season-review-history' })
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
  padding: 14px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 16px 34px rgba(38, 64, 45, 0.07);
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
  color: #8b958e;
  font-size: 11px;
  font-style: normal;
  font-weight: 850;
}

.goal-progress-list {
  margin-top: 12px;
  display: grid;
  gap: 9px;
}

.goal-progress-row {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
}

.goal-progress-meta {
  min-width: 0;
}

.goal-progress-meta strong,
.goal-progress-meta span {
  overflow: hidden;
  display: block;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.goal-progress-meta strong {
  color: #17211b;
  font-size: 12px;
  font-weight: 950;
}

.goal-progress-meta span {
  margin-top: 3px;
  color: #7a857d;
  font-size: 10px;
  font-weight: 850;
}

.goal-progress-track {
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(23, 33, 27, 0.07);
}

.goal-progress-track span {
  display: block;
  width: var(--progress);
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, color-mix(in srgb, var(--accent), #fff 18%), var(--accent));
  box-shadow: 0 0 16px color-mix(in srgb, var(--accent), transparent 68%);
  transition: width 0.28s ease;
}

.goal-progress-empty {
  margin: 12px 0 0;
  color: #68766d;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.6;
}

.record-section {
  min-height: 0;
  padding: 14px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.58);
  box-shadow: 0 16px 34px rgba(38, 64, 45, 0.06);
  display: flex;
  flex: 1;
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

.history-list {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 12px;
}

.history-list::-webkit-scrollbar {
  width: 4px;
}

.history-list::-webkit-scrollbar-thumb {
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
