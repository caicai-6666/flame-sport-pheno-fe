<template>
  <section class="shop-page" aria-label="积分商城">
    <div class="shop-hero">
      <span class="shop-eyebrow">POINTS STORE</span>
      <h1>积分商城</h1>
      <p>使用赛季积分兑换运动周边和健康补给，不同档次商品会按所需积分分组展示。</p>

      <div class="shop-wallet">
        <div>
          <span>可用积分</span>
          <strong>{{ displayPoints }}</strong>
          <em
            v-for="delta in pointDeltas"
            :key="delta.id"
            class="point-delta"
          >
            -{{ delta.points }}
          </em>
        </div>
        <button class="exchange-history" type="button" @click="isRecordView = !isRecordView">
          {{ isRecordView ? '返回商城' : '兑换记录' }}
        </button>
      </div>
    </div>

    <div v-if="isRecordView" class="exchange-records">
      <div class="records-heading">
        <div>
          <span>EXCHANGE LOG</span>
          <h2>兑换记录</h2>
        </div>
        <strong>{{ sortedExchangeRecords.length }} 条</strong>
      </div>

      <div v-if="sortedExchangeRecords.length" class="record-list">
        <article
          v-for="record in sortedExchangeRecords"
          :key="record.id"
          class="exchange-record-card"
        >
          <div class="record-date-badge">
            <strong>{{ formatDay(record.redeemedAt) }}</strong>
            <span>{{ formatMonth(record.redeemedAt) }}</span>
          </div>

          <div class="exchange-record-body">
            <div class="exchange-record-main">
              <strong :title="record.rewardName">{{ record.rewardName }}</strong>
              <span>{{ formatDate(record.redeemedAt) }}</span>
            </div>

            <div class="exchange-record-meta">
              <div>
                <span>奖品价值</span>
                <strong>{{ record.points }} 分</strong>
              </div>
              <div>
                <span>兑换后剩余</span>
                <strong>{{ record.remainingPoints }} 分</strong>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="empty-records">
        <span>暂无兑换记录</span>
        <p>完成兑换后，记录会按时间倒序展示在这里。</p>
      </div>
    </div>

    <div v-else class="tier-list">
      <section
        v-for="tier in rewardTiers"
        :key="tier.points"
        class="reward-tier"
      >
        <div class="tier-heading">
          <div>
            <span>{{ tier.label }}</span>
            <h2>{{ tier.points }}积分礼品</h2>
          </div>
          <strong>{{ tier.items.length }} 款</strong>
        </div>

        <div class="reward-grid">
          <article
            v-for="item in tier.items"
            :key="item.name"
            class="reward-card"
            :class="{ 'is-unavailable': availablePoints < tier.points }"
          >
            <div class="reward-visual" :style="{ '--reward-accent': item.accent }">
              <span>{{ item.icon }}</span>
              <small>奖品示意图</small>
            </div>

            <div class="reward-info">
              <strong>{{ item.name }}</strong>
              <span>{{ item.description }}</span>
            </div>

            <button
              class="redeem-button"
              type="button"
              :class="{ 'is-confirming': pendingRedeemKey === rewardKey(item, tier.points) }"
              :disabled="availablePoints < tier.points"
              @click="handleRedeemClick(item, tier.points)"
            >
              <Transition name="redeem-label" mode="out-in">
                <span
                  :key="redeemButtonText(item, tier.points)"
                  class="redeem-button-label"
                >
                  {{ redeemButtonText(item, tier.points) }}
                </span>
              </Transition>
              <span
                v-for="burst in rewardConfettiBurstsFor(item, tier.points)"
                :key="burst.id"
                class="reward-confetti-burst"
                aria-hidden="true"
              >
                <span
                  v-for="particle in burst.particles"
                  :key="particle.id"
                  class="reward-confetti-piece"
                  :style="{
                    '--angle': `${particle.angle}deg`,
                    '--distance': `${particle.distance}px`,
                    '--confetti-color': particle.color,
                    '--confetti-size': `${particle.size}px`,
                    '--delay': `${particle.delay}ms`
                  }"
                ></span>
              </span>
            </button>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<script>
const rewardTiers = [
  {
    points: 20,
    label: '轻量兑换',
    items: [
      {
        name: '运动毛巾',
        description: '训练后快速吸汗',
        icon: '▧',
        accent: '#72d84f'
      },
      {
        name: '羽毛球袜',
        description: '透气耐磨日常款',
        icon: '◒',
        accent: '#20c7b5'
      }
    ]
  },
  {
    points: 30,
    label: '进阶奖励',
    items: [
      {
        name: '筋膜球',
        description: '放松肩颈和足底',
        icon: '●',
        accent: '#ff9f45'
      },
      {
        name: '跳绳',
        description: '便携有氧训练',
        icon: '⌁',
        accent: '#7b8cff'
      }
    ]
  },
  {
    points: 50,
    label: '高阶礼品',
    items: [
      {
        name: '运动水杯',
        description: '大容量随行补水',
        icon: '◫',
        accent: '#3fb06d'
      },
      {
        name: '瑜伽垫',
        description: '居家拉伸训练',
        icon: '▭',
        accent: '#ff6f91'
      }
    ]
  }
]

const exchangeRecords = [
  {
    id: 'exchange-20260714-cup',
    redeemedAt: '2026-07-14T18:32:00+08:00',
    rewardName: '运动水杯',
    points: 50,
    remainingPoints: 68
  },
  {
    id: 'exchange-20260708-towel',
    redeemedAt: '2026-07-08T12:10:00+08:00',
    rewardName: 'PHENO 夏季限定速干运动毛巾礼盒',
    points: 20,
    remainingPoints: 118
  },
  {
    id: 'exchange-20260702-socks',
    redeemedAt: '2026-07-02T09:26:00+08:00',
    rewardName: '羽毛球袜',
    points: 20,
    remainingPoints: 138
  }
]

export default {
  name: 'ShopPage',
  data() {
    return {
      availablePoints: 68,
      displayPoints: 68,
      isRecordView: false,
      pendingRedeemKey: '',
      pendingRedeemTimer: null,
      pointAnimationFrame: null,
      pointDeltas: [],
      pointDeltaTimers: [],
      rewardConfettiBursts: [],
      rewardConfettiTimers: [],
      rewardTiers,
      exchangeRecords
    }
  },
  computed: {
    sortedExchangeRecords() {
      return [...this.exchangeRecords].sort((a, b) => new Date(b.redeemedAt) - new Date(a.redeemedAt))
    }
  },
  methods: {
    rewardKey(item, points) {
      return `${points}-${item.name}`
    },
    redeemButtonText(item, points) {
      if (this.availablePoints < points) {
        return '积分不足'
      }

      return this.pendingRedeemKey === this.rewardKey(item, points) ? '确认兑换' : '兑换'
    },
    handleRedeemClick(item, points) {
      if (this.availablePoints < points) {
        return
      }

      const key = this.rewardKey(item, points)

      if (this.pendingRedeemKey !== key) {
        this.pendingRedeemKey = key

        if (this.pendingRedeemTimer) {
          window.clearTimeout(this.pendingRedeemTimer)
        }

        this.pendingRedeemTimer = window.setTimeout(() => {
          this.pendingRedeemKey = ''
          this.pendingRedeemTimer = null
        }, 1800)
        return
      }

      this.redeemReward(item, points)
    },
    redeemReward(item, points) {
      if (this.availablePoints < points) {
        return
      }

      const oldPoints = this.availablePoints
      this.availablePoints -= points
      this.pendingRedeemKey = ''

      if (this.pendingRedeemTimer) {
        window.clearTimeout(this.pendingRedeemTimer)
        this.pendingRedeemTimer = null
      }

      this.animatePoints(oldPoints, this.availablePoints)
      this.launchPointDelta(points)
      this.launchRewardConfetti(this.rewardKey(item, points))
      this.exchangeRecords = [
        {
          id: `exchange-${Date.now()}`,
          redeemedAt: new Date().toISOString(),
          rewardName: item.name,
          points,
          remainingPoints: this.availablePoints
        },
        ...this.exchangeRecords
      ]
    },
    animatePoints(from, to) {
      if (this.pointAnimationFrame) {
        window.cancelAnimationFrame(this.pointAnimationFrame)
      }

      const duration = 680
      const startedAt = performance.now()
      const easeOut = progress => 1 - Math.pow(1 - progress, 3)

      const step = now => {
        const progress = Math.min((now - startedAt) / duration, 1)
        this.displayPoints = Math.round(from + (to - from) * easeOut(progress))

        if (progress < 1) {
          this.pointAnimationFrame = window.requestAnimationFrame(step)
          return
        }

        this.displayPoints = to
        this.pointAnimationFrame = null
      }

      this.pointAnimationFrame = window.requestAnimationFrame(step)
    },
    launchPointDelta(points) {
      const delta = {
        id: Date.now(),
        points
      }

      this.pointDeltas = [...this.pointDeltas, delta]

      const timer = window.setTimeout(() => {
        this.pointDeltas = this.pointDeltas.filter(item => item.id !== delta.id)
        this.pointDeltaTimers = this.pointDeltaTimers.filter(item => item !== timer)
      }, 920)

      this.pointDeltaTimers = [...this.pointDeltaTimers, timer]
    },
    rewardConfettiBurstsFor(item, points) {
      const key = this.rewardKey(item, points)
      return this.rewardConfettiBursts.filter(burst => burst.rewardKey === key)
    },
    launchRewardConfetti(rewardKey) {
      const colors = ['#ffffff', '#baf19d', '#72d84f', '#20c7b5', '#ffd166', '#ff9f45']
      const burst = {
        id: Date.now(),
        rewardKey,
        particles: Array.from({ length: 18 }, (_, index) => ({
          id: index,
          angle: Math.round((360 / 18) * index + Math.random() * 20 - 10),
          distance: Math.round(34 + Math.random() * 48),
          color: colors[index % colors.length],
          size: Math.round(4 + Math.random() * 5),
          delay: Math.round(Math.random() * 42)
        }))
      }

      this.rewardConfettiBursts = [...this.rewardConfettiBursts, burst]

      const timer = window.setTimeout(() => {
        this.rewardConfettiBursts = this.rewardConfettiBursts.filter(item => item.id !== burst.id)
        this.rewardConfettiTimers = this.rewardConfettiTimers.filter(item => item !== timer)
      }, 880)

      this.rewardConfettiTimers = [...this.rewardConfettiTimers, timer]
    },
    formatMonth(value) {
      const date = new Date(value)
      return `${date.getMonth() + 1}月`
    },
    formatDay(value) {
      const date = new Date(value)
      return `${date.getDate()}日`
    },
    formatDate(value) {
      const date = new Date(value)
      return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }
  },
  beforeUnmount() {
    if (this.pendingRedeemTimer) {
      window.clearTimeout(this.pendingRedeemTimer)
    }

    if (this.pointAnimationFrame) {
      window.cancelAnimationFrame(this.pointAnimationFrame)
    }

    this.pointDeltaTimers.forEach(timer => window.clearTimeout(timer))
    this.rewardConfettiTimers.forEach(timer => window.clearTimeout(timer))
  }
}
</script>

<style scoped>
.shop-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.shop-hero {
  position: relative;
  overflow: hidden;
  padding: 24px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 32px;
  background:
    radial-gradient(circle at 84% 16%, rgba(32, 199, 181, 0.32), transparent 27%),
    linear-gradient(140deg, rgba(255, 255, 255, 0.95), rgba(237, 250, 247, 0.88));
  box-shadow: 0 18px 44px rgba(47, 89, 55, 0.1);
}

.shop-hero::after {
  position: absolute;
  right: -36px;
  bottom: -50px;
  width: 152px;
  height: 152px;
  border: 1px solid rgba(32, 199, 181, 0.22);
  border-radius: 50%;
  content: '';
}

.shop-eyebrow {
  color: #159b8d;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.16em;
}

.shop-hero h1 {
  position: relative;
  z-index: 1;
  margin: 10px 0 8px;
  font-size: clamp(28px, 7.4vw, 34px);
  line-height: 1.08;
  letter-spacing: -0.04em;
}

.shop-hero p {
  position: relative;
  z-index: 1;
  max-width: 300px;
  margin: 0;
  color: #68766d;
  font-size: 13px;
  line-height: 1.65;
}

.shop-wallet {
  position: relative;
  z-index: 1;
  margin-top: 18px;
  padding: 12px 14px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.72);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.shop-wallet > div {
  position: relative;
}

.shop-wallet span {
  display: block;
  color: #68766d;
  font-size: 11px;
  font-weight: 850;
}

.shop-wallet strong {
  display: block;
  margin-top: 2px;
  color: #17211b;
  font-size: 28px;
  font-weight: 950;
  line-height: 1;
}

.point-delta {
  position: absolute;
  right: -30px;
  bottom: 4px;
  color: #e05a38;
  font-size: 13px;
  font-style: normal;
  font-weight: 950;
  pointer-events: none;
  animation: point-delta-float 900ms cubic-bezier(0.16, 0.9, 0.28, 1) forwards;
}

@keyframes point-delta-float {
  0% {
    opacity: 0;
    transform: translateY(8px) scale(0.82);
  }

  18% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translateY(-22px) scale(1.08);
  }
}

.exchange-history {
  min-height: 38px;
  padding: 0 13px;
  border: 0;
  border-radius: 999px;
  background: #17211b;
  color: #fff;
  box-shadow:
    0 10px 20px rgba(23, 33, 27, 0.18),
    inset 0 -2px 0 rgba(255, 255, 255, 0.08);
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
  transform: translateY(0) scale(1);
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease,
    transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.exchange-history:hover {
  background: #213127;
  box-shadow:
    0 14px 24px rgba(23, 33, 27, 0.22),
    inset 0 -2px 0 rgba(255, 255, 255, 0.08);
  filter: brightness(1.03);
  transform: translateY(-2px) scale(1.01);
}

.exchange-history:active {
  box-shadow:
    0 5px 12px rgba(23, 33, 27, 0.2),
    inset 0 3px 8px rgba(0, 0, 0, 0.24);
  filter: brightness(0.96);
  transform: translateY(2px) scale(0.96);
  transition-duration: 0.08s;
}

.exchange-history:focus-visible {
  outline: 3px solid rgba(32, 199, 181, 0.34);
  outline-offset: 3px;
}

.tier-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.exchange-records {
  padding: 16px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 16px 38px rgba(38, 64, 45, 0.08);
}

.records-heading {
  margin-bottom: 12px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.records-heading span {
  color: #159b8d;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.12em;
}

.records-heading h2 {
  margin: 4px 0 0;
  font-size: 22px;
  line-height: 1.1;
  letter-spacing: -0.04em;
}

.records-heading > strong {
  flex-shrink: 0;
  padding: 6px 9px;
  border-radius: 999px;
  background: rgba(32, 199, 181, 0.12);
  color: #159b8d;
  font-size: 11px;
  font-weight: 950;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.exchange-record-card {
  min-height: 112px;
  padding: 12px;
  border: 1px solid rgba(23, 33, 27, 0.07);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(247, 250, 245, 0.76)),
    #fff;
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  gap: 12px;
}

.record-date-badge {
  width: 54px;
  height: 54px;
  border-radius: 20px;
  background: rgba(32, 199, 181, 0.14);
  color: #159b8d;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.record-date-badge strong {
  font-size: 15px;
  font-weight: 950;
  line-height: 1;
}

.record-date-badge span {
  margin-top: 4px;
  font-size: 11px;
  font-weight: 850;
}

.exchange-record-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.exchange-record-main {
  min-width: 0;
}

.exchange-record-main > strong {
  display: -webkit-box;
  overflow: hidden;
  color: #17211b;
  font-size: 15px;
  font-weight: 950;
  line-height: 1.28;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.exchange-record-main > span {
  display: block;
  margin-top: 5px;
  color: #8a958e;
  font-size: 11px;
  font-weight: 800;
}

.exchange-record-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.exchange-record-meta div {
  min-width: 0;
  padding: 8px 9px;
  border-radius: 16px;
  background: rgba(23, 33, 27, 0.04);
}

.exchange-record-meta span {
  display: block;
  overflow: hidden;
  color: #758078;
  font-size: 10px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.exchange-record-meta strong {
  display: block;
  margin-top: 3px;
  color: #17211b;
  font-size: 13px;
  font-weight: 950;
  line-height: 1.1;
}

.empty-records {
  min-height: 190px;
  padding: 26px 18px;
  border: 1px dashed rgba(23, 33, 27, 0.14);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.6);
  color: #68766d;
  display: grid;
  place-items: center;
  text-align: center;
}

.empty-records span {
  color: #17211b;
  font-size: 17px;
  font-weight: 950;
}

.empty-records p {
  max-width: 240px;
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.6;
}

.reward-tier {
  padding: 16px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 16px 38px rgba(38, 64, 45, 0.08);
}

.tier-heading {
  margin-bottom: 12px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.tier-heading span {
  color: #159b8d;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.12em;
}

.tier-heading h2 {
  margin: 4px 0 0;
  font-size: 22px;
  line-height: 1.1;
  letter-spacing: -0.04em;
}

.tier-heading > strong {
  flex-shrink: 0;
  padding: 6px 9px;
  border-radius: 999px;
  background: rgba(32, 199, 181, 0.12);
  color: #159b8d;
  font-size: 11px;
  font-weight: 950;
}

.reward-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.reward-card {
  min-height: 214px;
  padding: 10px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 250, 245, 0.72)),
    #fff;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reward-card.is-unavailable {
  opacity: 0.58;
  filter: grayscale(0.2);
}

.reward-visual {
  min-height: 104px;
  border-radius: 20px;
  background:
    radial-gradient(circle at 78% 18%, color-mix(in srgb, var(--reward-accent), transparent 56%), transparent 28%),
    linear-gradient(135deg, color-mix(in srgb, var(--reward-accent), #fff 72%), rgba(255, 255, 255, 0.8));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.reward-visual span {
  color: color-mix(in srgb, var(--reward-accent), #111 22%);
  font-size: 34px;
  font-weight: 950;
  line-height: 1;
}

.reward-visual small {
  color: rgba(23, 33, 27, 0.54);
  font-size: 11px;
  font-weight: 850;
}

.reward-info {
  min-height: 48px;
}

.reward-info strong {
  display: block;
  color: #17211b;
  font-size: 14px;
  font-weight: 950;
  line-height: 1.2;
}

.reward-info span {
  display: block;
  margin-top: 4px;
  color: #758078;
  font-size: 11px;
  font-weight: 750;
  line-height: 1.35;
}

.redeem-button {
  position: relative;
  min-height: 38px;
  margin-top: auto;
  border: 0;
  border-radius: 15px;
  background: linear-gradient(135deg, #72d84f, #2f8f32);
  color: #fff;
  box-shadow: 0 12px 22px rgba(47, 143, 50, 0.22);
  cursor: pointer;
  font-size: 13px;
  font-weight: 950;
  overflow: visible;
  transform: translateY(0) scale(1);
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease,
    transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.redeem-button:not(:disabled):hover {
  box-shadow: 0 15px 26px rgba(47, 143, 50, 0.28);
  filter: brightness(1.03);
  transform: translateY(-2px) scale(1.01);
}

.redeem-button:not(:disabled):active {
  box-shadow:
    0 6px 12px rgba(47, 143, 50, 0.22),
    inset 0 3px 8px rgba(23, 33, 27, 0.2);
  filter: brightness(0.96);
  transform: translateY(2px) scale(0.96);
  transition-duration: 0.08s;
}

.redeem-button.is-confirming {
  background: linear-gradient(135deg, #ffb84d, #ff7a45);
  box-shadow:
    0 12px 24px rgba(255, 122, 69, 0.26),
    0 0 0 4px rgba(255, 184, 77, 0.18);
  animation: confirm-pulse 1.1s ease-in-out infinite;
}

@keyframes confirm-pulse {
  0%,
  100% {
    filter: brightness(1);
  }

  50% {
    filter: brightness(1.08);
  }
}

.redeem-button-label {
  display: inline-block;
  min-width: 52px;
}

.redeem-label-enter-active,
.redeem-label-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.redeem-label-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.96);
}

.redeem-label-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}

.redeem-button:disabled {
  background: rgba(23, 33, 27, 0.12);
  box-shadow: none;
  color: rgba(23, 33, 27, 0.42);
  cursor: not-allowed;
  transform: none;
}

.reward-confetti-burst {
  position: absolute;
  z-index: 2;
  top: 50%;
  left: 50%;
  width: 1px;
  height: 1px;
  pointer-events: none;
}

.reward-confetti-piece {
  position: absolute;
  top: 0;
  left: 0;
  width: var(--confetti-size);
  height: calc(var(--confetti-size) * 0.58);
  border-radius: 999px;
  background: var(--confetti-color);
  box-shadow: 0 0 10px color-mix(in srgb, var(--confetti-color), transparent 45%);
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.4);
  animation: reward-confetti-pop 780ms cubic-bezier(0.16, 0.9, 0.28, 1) forwards;
  animation-delay: var(--delay);
}

.reward-confetti-piece:nth-child(3n) {
  border-radius: 2px;
}

.reward-confetti-piece:nth-child(4n) {
  width: calc(var(--confetti-size) * 0.58);
  height: calc(var(--confetti-size) * 0.58);
}

@keyframes reward-confetti-pop {
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
      scale(0.84)
      rotate(520deg);
  }
}
</style>
