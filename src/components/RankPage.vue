<template>
  <section class="rank-page" aria-label="打卡上传排行榜">
    <div class="rank-hero">
      <span class="rank-eyebrow">SEASON CHECK-IN</span>
      <h1>打卡排行榜</h1>
      <p>非实时数据</p>
    </div>

    <div
      class="my-rank-card"
      :class="{
        'is-outside-top': !isCurrentInTopList,
        'is-loaded': isContentReady
      }"
    >
      <div>
        <span>我的排名</span>
        <strong>{{ currentRankText }}</strong>
      </div>
      <div>
        <span>上传次数</span>
        <strong>{{ currentCheckinText }}</strong>
      </div>
      <div>
        <span>参与人数</span>
        <strong>{{ leaderboardTotal }} 人</strong>
      </div>
    </div>

    <div class="rank-board">
      <div class="rank-board-header">
        <span>排名</span>
        <span>员工</span>
        <span>部门</span>
        <span>打卡次数</span>
      </div>

      <div class="rank-list">
        <div v-if="isLoading" class="rank-status">
          <span class="rank-loading-spinner" aria-hidden="true"></span>
          <span>正在加载排行榜</span>
          <div class="rank-loading-bars" aria-hidden="true">
            <i></i>
            <i></i>
            <i></i>
          </div>
        </div>

        <div v-else-if="errorMessage" class="rank-status is-error">
          <span>{{ errorMessage }}</span>
          <button type="button" @click="$emit('retry')">重试</button>
        </div>

        <div v-else-if="!displayRows.length" class="rank-status">
          <span>暂无排行榜数据</span>
        </div>

        <TransitionGroup v-else name="rank-row-reveal" tag="div" class="rank-reveal-list">
          <template v-for="(row, index) in displayRows" :key="row.type === 'ellipsis' ? 'ellipsis' : row.employee.id">
            <div
              v-if="row.type === 'ellipsis'"
              class="rank-ellipsis"
              aria-label="省略部分排名"
              :style="{ '--row-index': index }"
            >
              <span></span>
              <strong>···</strong>
              <span>您当前在前 15 名之后</span>
            </div>

            <article
              v-else
              class="rank-row"
              :class="{
                'is-current': row.employee.isCurrentUser,
                'is-top-three': row.rank <= 3
              }"
              :style="{ '--bar-width': `${row.percent}%`, '--row-index': index }"
            >
              <span
                v-if="row.rank <= 3"
                class="rank-medal"
                :class="rankMedalTone(row.rank)"
                :aria-label="`第 ${row.rank} 名`"
              >
                <span class="medal-ribbon" aria-hidden="true"></span>
                <span class="medal-core" aria-hidden="true"></span>
              </span>
              <span v-else class="rank-number">{{ row.rank }}</span>
              <div class="employee-meta">
                <strong>{{ row.employee.name }}</strong>
                <small class="level-label" :class="challengeLevelTone(row.employee)">
                  {{ challengeLevelText(row.employee) }}
                </small>
              </div>
              <span class="department-pill">{{ row.employee.departmentName }}</span>
              <div class="score-track" aria-hidden="true">
                <span class="score-bar"></span>
              </div>
              <strong class="score-value">{{ row.employee.checkinCount }}次</strong>
            </article>
          </template>
        </TransitionGroup>
      </div>
    </div>
  </section>
</template>

<script>
const CHALLENGE_LEVEL_META = {
  1: {
    label: '青铜',
    tone: 'bronze'
  },
  2: {
    label: '白银',
    tone: 'silver'
  },
  3: {
    label: '黄金',
    tone: 'gold'
  }
}

const RANK_MEDAL_TONES = {
  1: 'gold',
  2: 'silver',
  3: 'bronze'
}

export default {
  name: 'RankPage',
  emits: ['retry'],
  props: {
    leaderboardRecords: {
      type: Array,
      default: () => []
    },
    isLoading: {
      type: Boolean,
      default: false
    },
    errorMessage: {
      type: String,
      default: ''
    }
  },
  computed: {
    rankedEmployees() {
      return [...this.leaderboardRecords].sort((a, b) => b.checkinCount - a.checkinCount)
    },
    maxScore() {
      return this.rankedEmployees[0]?.checkinCount || 1
    },
    leaderboardTotal() {
      return this.rankedEmployees.length
    },
    currentRank() {
      const currentIndex = this.rankedEmployees.findIndex(employee => employee.isCurrentUser)

      return currentIndex >= 0 ? currentIndex + 1 : 0
    },
    currentEmployee() {
      return this.rankedEmployees.find(employee => employee.isCurrentUser) || null
    },
    currentRankText() {
      return this.currentRank ? `第 ${this.currentRank} 名` : '未上榜'
    },
    currentCheckinText() {
      return this.currentEmployee ? `${this.currentEmployee.checkinCount} 次` : '--'
    },
    topRows() {
      return this.rankedEmployees.slice(0, 15).map((employee, index) => this.toRankRow(employee, index + 1))
    },
    isCurrentInTopList() {
      return this.currentRank > 0 && this.currentRank <= 15
    },
    displayRows() {
      if (this.isCurrentInTopList || !this.currentEmployee) {
        return this.topRows
      }

      return [
        ...this.topRows,
        { type: 'ellipsis' },
        this.toRankRow(this.currentEmployee, this.currentRank)
      ]
    },
    isContentReady() {
      return !this.isLoading && !this.errorMessage
    }
  },
  methods: {
    toRankRow(employee, rank) {
      const percent = employee.checkinCount > 0
        ? Math.max((employee.checkinCount / this.maxScore) * 100, 8).toFixed(2)
        : '0.00'

      return {
        type: 'employee',
        employee,
        rank,
        percent
      }
    },
    rankMedalTone(rank) {
      return RANK_MEDAL_TONES[rank] || ''
    },
    challengeLevelText(employee) {
      return CHALLENGE_LEVEL_META[employee.projectRuleLevelId]?.label || '未选择等级'
    },
    challengeLevelTone(employee) {
      return CHALLENGE_LEVEL_META[employee.projectRuleLevelId]?.tone || 'unknown'
    }
  }
}
</script>

<style scoped>
.rank-page {
  height: calc(100vh - 188px);
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rank-hero {
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  padding: 24px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 32px;
  background:
    radial-gradient(circle at 84% 18%, rgba(114, 216, 79, 0.44), transparent 27%),
    linear-gradient(140deg, rgba(255, 255, 255, 0.95), rgba(239, 248, 235, 0.86));
  box-shadow: 0 18px 44px rgba(47, 89, 55, 0.12);
}

.rank-hero::after {
  position: absolute;
  right: -38px;
  bottom: -52px;
  width: 150px;
  height: 150px;
  border: 1px solid rgba(47, 143, 50, 0.18);
  border-radius: 50%;
  content: '';
}

.rank-eyebrow {
  color: #2f8f32;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.16em;
}

.rank-hero h1 {
  position: relative;
  z-index: 1;
  margin: 10px 0 8px;
  font-size: clamp(28px, 7.4vw, 34px);
  line-height: 1.08;
  letter-spacing: -0.04em;
}

.rank-hero p {
  position: relative;
  z-index: 1;
  max-width: 300px;
  margin: 0;
  color: #68766d;
  font-size: 13px;
  line-height: 1.65;
}

.my-rank-card {
  flex-shrink: 0;
  padding: 14px 16px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 24px;
  background:
    linear-gradient(135deg, rgba(23, 33, 27, 0.94), rgba(37, 60, 42, 0.92)),
    #17211b;
  box-shadow: 0 18px 36px rgba(23, 33, 27, 0.14);
  color: #fff;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  opacity: 0.46;
  filter: blur(3px);
  transform: translateY(8px);
  transition:
    opacity 0.54s ease,
    filter 0.54s ease,
    transform 0.54s cubic-bezier(0.16, 0.9, 0.28, 1);
}

.my-rank-card.is-loaded {
  opacity: 1;
  filter: blur(0);
  transform: translateY(0);
}

.my-rank-card.is-outside-top {
  background:
    radial-gradient(circle at 86% 20%, rgba(114, 216, 79, 0.32), transparent 30%),
    linear-gradient(135deg, #17211b, #263d2a);
}

.my-rank-card span {
  display: block;
  color: rgba(255, 255, 255, 0.62);
  font-size: 11px;
  font-weight: 800;
}

.my-rank-card strong {
  display: block;
  margin-top: 4px;
  overflow: hidden;
  font-size: 16px;
  font-weight: 950;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-board {
  min-height: 0;
  padding: 14px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 16px 38px rgba(38, 64, 45, 0.09);
  display: flex;
  flex: 1;
  flex-direction: column;
}

.rank-board-header {
  flex-shrink: 0;
  padding: 0 4px 10px;
  color: #758078;
  display: grid;
  grid-template-columns: 28px minmax(52px, 0.75fr) 70px minmax(0, 1fr) 34px;
  gap: 6px;
  font-size: 11px;
  font-weight: 900;
}

.rank-board-header span:nth-child(3) {
  text-align: center;
}

.rank-board-header span:nth-child(4) {
  grid-column: 4 / 6;
  text-align: center;
}

.rank-list {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
}

.rank-list::-webkit-scrollbar {
  width: 4px;
}

.rank-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(23, 33, 27, 0.14);
}

.rank-reveal-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rank-row-reveal-enter-active {
  transition:
    opacity 0.56s ease,
    transform 0.56s cubic-bezier(0.16, 0.9, 0.28, 1),
    filter 0.56s ease;
  transition-delay: calc(var(--row-index, 0) * 34ms);
}

.rank-row-reveal-enter-from {
  opacity: 0;
  filter: blur(6px);
  transform: translateY(14px) scale(0.98);
}

.rank-row {
  flex-shrink: 0;
  min-height: 48px;
  padding: 9px 10px;
  border: 1px solid rgba(23, 33, 27, 0.06);
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 250, 245, 0.72)),
    #fff;
  display: grid;
  grid-template-columns: 28px minmax(52px, 0.75fr) 70px minmax(0, 1fr) 34px;
  align-items: center;
  gap: 6px;
}

.rank-row.is-current {
  border-color: rgba(47, 143, 50, 0.32);
  background:
    radial-gradient(circle at 94% 20%, rgba(114, 216, 79, 0.32), transparent 32%),
    linear-gradient(180deg, rgba(241, 252, 236, 0.98), rgba(255, 255, 255, 0.78));
  box-shadow:
    0 14px 28px rgba(47, 143, 50, 0.12),
    inset 0 0 0 1px rgba(114, 216, 79, 0.14);
  font-weight: 950;
}

.rank-number {
  width: 28px;
  height: 28px;
  border-radius: 12px;
  background: rgba(23, 33, 27, 0.06);
  color: #56625a;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 950;
}

.employee-meta {
  min-width: 0;
}

.rank-medal {
  position: relative;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: end center;
}

.medal-ribbon {
  position: absolute;
  top: 2px;
  left: 50%;
  width: 16px;
  height: 14px;
  border-radius: 4px 4px 2px 2px;
  background: linear-gradient(135deg, #d85848 0 48%, #f6ead7 48% 55%, #425c85 55% 100%);
  transform: translateX(-50%);
  clip-path: polygon(0 0, 100% 0, 86% 100%, 50% 74%, 14% 100%);
}

.medal-core {
  position: relative;
  z-index: 1;
  width: 20px;
  height: 20px;
  border: 1px solid rgba(23, 33, 27, 0.12);
  border-radius: 50%;
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.68),
    0 4px 8px rgba(23, 33, 27, 0.12);
}

.rank-medal.gold .medal-core {
  background: linear-gradient(135deg, #fff0a9, #f1b82d 58%, #c98b07);
}

.rank-medal.silver .medal-core {
  background: linear-gradient(135deg, #f6f8fb, #b9c1ca 58%, #7f8994);
}

.rank-medal.bronze .medal-core {
  background: linear-gradient(135deg, #f0be82, #b87333 58%, #83501f);
}

.employee-meta strong {
  display: block;
  overflow: hidden;
  color: #17211b;
  font-size: 13px;
  font-weight: 900;
  line-height: 1.18;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.level-label {
  display: block;
  overflow: hidden;
  margin-top: 3px;
  font-size: 10px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.level-label.bronze {
  color: #a96c32;
}

.level-label.silver {
  color: #7f8790;
}

.level-label.gold {
  color: #b98512;
}

.level-label.unknown {
  color: #8a958e;
}

.department-pill {
  width: 100%;
  min-width: 0;
  padding: 5px 6px;
  border-radius: 999px;
  background: rgba(23, 33, 27, 0.06);
  color: #4f5d55;
  font-size: 10px;
  font-weight: 950;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
  justify-self: center;
}

.rank-row.is-current .department-pill {
  background: rgba(114, 216, 79, 0.18);
  color: #2f8f32;
}

.score-track {
  position: relative;
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(23, 33, 27, 0.07);
}

.score-bar {
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--bar-width);
  border-radius: inherit;
  background: linear-gradient(90deg, #72d84f, #2f8f32);
  box-shadow: 0 0 16px rgba(47, 143, 50, 0.22);
}

.rank-row.is-current .score-bar {
  background: linear-gradient(90deg, #baf19d, #39b54a);
}

.score-value {
  color: #17211b;
  font-size: 12px;
  font-weight: 950;
  text-align: right;
  white-space: nowrap;
}

.rank-ellipsis {
  flex-shrink: 0;
  min-height: 36px;
  padding: 4px 10px;
  color: #7a857d;
  display: grid;
  grid-template-columns: 28px 44px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 850;
}

.rank-ellipsis span:last-child {
  justify-self: center;
  text-align: center;
}

.rank-ellipsis strong {
  color: #17211b;
  font-size: 20px;
  letter-spacing: 0.14em;
  line-height: 1;
}

.rank-status {
  min-height: 160px;
  padding: 24px;
  border: 1px dashed rgba(23, 33, 27, 0.12);
  border-radius: 22px;
  background:
    radial-gradient(circle at 50% 28%, rgba(114, 216, 79, 0.14), transparent 34%),
    rgba(255, 255, 255, 0.5);
  color: #748179;
  display: grid;
  place-items: center;
  gap: 12px;
  font-size: 13px;
  font-weight: 850;
  text-align: center;
}

.rank-loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(47, 143, 50, 0.14);
  border-top-color: #2f8f32;
  border-radius: 50%;
  box-shadow: 0 0 18px rgba(114, 216, 79, 0.18);
  animation: rank-loading-spin 820ms linear infinite;
}

.rank-loading-bars {
  width: min(220px, 100%);
  display: grid;
  gap: 8px;
}

.rank-loading-bars i {
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(23, 33, 27, 0.06);
  position: relative;
}

.rank-loading-bars i:nth-child(2) {
  width: 82%;
  justify-self: center;
}

.rank-loading-bars i:nth-child(3) {
  width: 62%;
  justify-self: center;
}

.rank-loading-bars i::after {
  position: absolute;
  inset: 0;
  content: '';
  background: linear-gradient(90deg, transparent, rgba(114, 216, 79, 0.38), transparent);
  transform: translateX(-100%);
  animation: rank-loading-shimmer 1.2s ease-in-out infinite;
}

.rank-loading-bars i:nth-child(2)::after {
  animation-delay: 120ms;
}

.rank-loading-bars i:nth-child(3)::after {
  animation-delay: 240ms;
}

@keyframes rank-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes rank-loading-shimmer {
  100% {
    transform: translateX(100%);
  }
}

.rank-status.is-error {
  color: #b04a3f;
  background: rgba(255, 111, 97, 0.06);
}

.rank-status button {
  padding: 8px 16px;
  border: 0;
  border-radius: 999px;
  background: #17211b;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
}
</style>
