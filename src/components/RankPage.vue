<template>
  <section class="rank-page" aria-label="积分排行榜">
    <div class="rank-hero">
      <span class="rank-eyebrow">SEASON SCORE</span>
      <h1>总积分排行榜</h1>
    </div>

    <div class="my-rank-card" :class="{ 'is-outside-top': !isCurrentInTopList }">
      <div>
        <span>我的排名</span>
        <strong>第 {{ currentRank }} 名</strong>
      </div>
      <div>
        <span>当前积分</span>
        <strong>{{ currentEmployee.score }} 分</strong>
      </div>
    </div>

    <div class="rank-board">
      <div class="rank-board-header">
        <span>排名</span>
        <span>员工</span>
        <span>积分进度</span>
      </div>

      <div class="rank-list">
        <template v-for="row in displayRows" :key="row.type === 'ellipsis' ? 'ellipsis' : row.employee.id">
          <div v-if="row.type === 'ellipsis'" class="rank-ellipsis" aria-label="省略部分排名">
            <span></span>
            <strong>···</strong>
            <span>您当前在前 15 名之后，继续加油上榜💪</span>
          </div>

          <article
            v-else
            class="rank-row"
            :class="{
              'is-current': row.employee.id === currentEmployeeId,
              'is-top-three': row.rank <= 3
            }"
            :style="{ '--bar-width': `${row.percent}%` }"
          >
            <span class="rank-number">{{ row.rank }}</span>
            <div class="employee-meta">
              <strong>{{ row.employee.name }}</strong>
              <small>{{ row.employee.team }}</small>
            </div>
            <div class="score-track" aria-hidden="true">
              <span class="score-bar"></span>
            </div>
            <strong class="score-value">{{ row.employee.score }}分</strong>
          </article>
        </template>
      </div>
    </div>
  </section>
</template>

<script>
const employees = [
  { id: 'james', name: 'james', team: '产品体验', score: 98 },
  { id: 'amy', name: 'amy', team: '市场增长', score: 92 },
  { id: 'jason', name: 'jason', team: '研发一组', score: 88 },
  { id: 'sophia', name: 'sophia', team: '运营中心', score: 84 },
  { id: 'leo', name: 'leo', team: '研发二组', score: 81 },
  { id: 'mia', name: 'mia', team: '设计团队', score: 79 },
  { id: 'owen', name: 'owen', team: '销售团队', score: 76 },
  { id: 'nina', name: 'nina', team: '人力行政', score: 74 },
  { id: 'ethan', name: 'ethan', team: '数据平台', score: 71 },
  { id: 'zoe', name: 'zoe', team: '客户成功', score: 69 },
  { id: 'chris', name: 'chris', team: '财务团队', score: 67 },
  { id: 'lily', name: 'lily', team: '研发三组', score: 65 },
  { id: 'tony', name: 'tony', team: '业务支持', score: 64 },
  { id: 'grace', name: 'grace', team: '品牌团队', score: 62 },
  { id: 'kevin', name: 'kevin', team: '测试团队', score: 60 },
  { id: 'mark', name: 'mark', team: '供应链', score: 58 },
  { id: 'iris', name: 'iris', team: '法务合规', score: 55 },
  { id: 'me', name: '我', team: '研发一组', score: 51 }
]

export default {
  name: 'RankPage',
  data() {
    return {
      currentEmployeeId: 'me',
      employees
    }
  },
  computed: {
    rankedEmployees() {
      return [...this.employees].sort((a, b) => b.score - a.score)
    },
    maxScore() {
      return this.rankedEmployees[0]?.score || 1
    },
    currentRank() {
      return this.rankedEmployees.findIndex(employee => employee.id === this.currentEmployeeId) + 1
    },
    currentEmployee() {
      return this.rankedEmployees.find(employee => employee.id === this.currentEmployeeId) || this.rankedEmployees[0]
    },
    topRows() {
      return this.rankedEmployees.slice(0, 15).map((employee, index) => this.toRankRow(employee, index + 1))
    },
    isCurrentInTopList() {
      return this.currentRank > 0 && this.currentRank <= 15
    },
    displayRows() {
      if (this.isCurrentInTopList) {
        return this.topRows
      }

      return [
        ...this.topRows,
        { type: 'ellipsis' },
        this.toRankRow(this.currentEmployee, this.currentRank)
      ]
    }
  },
  methods: {
    toRankRow(employee, rank) {
      return {
        type: 'employee',
        employee,
        rank,
        percent: Math.max((employee.score / this.maxScore) * 100, 8).toFixed(2)
      }
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
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
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
  font-size: 18px;
  font-weight: 950;
  line-height: 1.1;
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
  grid-template-columns: 34px 74px 1fr;
  gap: 8px;
  font-size: 11px;
  font-weight: 900;
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
  grid-template-columns: 28px 72px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 8px;
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

.rank-row.is-top-three .rank-number {
  background: linear-gradient(135deg, #ffe08a, #f1b82d);
  color: #5a3b00;
}

.employee-meta {
  min-width: 0;
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

.employee-meta small {
  display: block;
  overflow: hidden;
  margin-top: 3px;
  color: #8a958e;
  font-size: 10px;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
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
</style>
