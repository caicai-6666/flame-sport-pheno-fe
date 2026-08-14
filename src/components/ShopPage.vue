<template>
  <section class="shop-page" aria-label="积分商城">
    <div class="shop-hero">
      <span class="shop-eyebrow">POINTS STORE</span>
      <h1>积分商城</h1>
      <p>使用赛季积分兑换运动周边和健康补给，为目标助力！</p>
      <p class="redeem-window-hint" :class="{ 'is-unavailable': !isRedeemAvailable }">
        {{ redeemWindowMessage }}
      </p>

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
          {{ isRecordView ? '返回商城' : '积分流水' }}
        </button>
      </div>
    </div>

    <div v-if="isRecordView" class="exchange-records">
      <div class="records-heading">
        <div>
          <span>POINTS LOG</span>
          <h2>记录一览</h2>
        </div>
        <strong>{{ sortedPointRecords.length }} 条</strong>
      </div>

      <div v-if="isPointFlowLoading" class="empty-records">
        <span>正在加载积分流水</span>
      </div>

      <div v-else-if="pointFlowErrorMessage" class="empty-records is-error">
        <span>{{ pointFlowErrorMessage }}</span>
        <button type="button" @click="$emit('retry-point-flow')">重试</button>
      </div>

      <div v-else-if="sortedPointRecords.length" class="record-list">
        <article
          v-for="record in sortedPointRecords"
          :key="record.id"
          class="exchange-record-card"
          :class="`is-${record.type}`"
        >
          <div class="record-date-badge">
            <strong>{{ formatDay(record.occurredAt) }}</strong>
            <span>{{ formatMonth(record.occurredAt) }}</span>
          </div>

          <div class="exchange-record-body">
            <div class="exchange-record-main">
              <strong :title="record.title">{{ record.title }}</strong>
              <span>{{ record.description }} · {{ formatDate(record.occurredAt) }}</span>
            </div>

            <div class="exchange-record-meta">
              <div>
                <span>变动积分</span>
                <strong :class="record.amount > 0 ? 'is-income' : 'is-expense'">
                  {{ formatPointAmount(record.amount) }} 分
                </strong>
              </div>
              <div>
                <span>变动后余额</span>
                <strong>{{ record.balanceAfter }} 分</strong>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="empty-records">
        <span>暂无积分变动</span>
        <p>赛季奖励发放和商城兑换记录会按时间倒序展示在这里。</p>
      </div>
    </div>

    <div v-else-if="isProductLoading" class="shop-product-status">
      <span>正在加载奖品列表</span>
    </div>

    <div v-else-if="productErrorMessage" class="shop-product-status is-error">
      <span>{{ productErrorMessage }}</span>
      <button type="button" @click="$emit('retry-products')">重试</button>
    </div>

    <div v-else-if="!products.length" class="shop-product-status">
      <span>暂无可兑换奖品</span>
    </div>

    <div v-else class="tier-list">
      <section
        v-for="tier in rewardTiers"
        :key="tier.key"
        class="reward-tier"
        :class="{ 'is-crazy-tier': tier.key === 'crazy' }"
      >
        <div class="tier-heading">
          <div>
            <h2 v-if="tier.pointsTitle" class="tier-points-heading">
              <span>积分</span>
              <strong>{{ tier.pointsTitle }}</strong>
            </h2>
            <h2 v-else>{{ tier.title }}</h2>
          </div>
        </div>

        <div class="reward-grid">
          <article
            v-for="item in tier.items"
            :key="item.id"
            class="reward-card"
          >
            <div
              class="reward-visual"
              :class="{
                'is-image-loading': item.isImageLoading && !item.isImageLoaded,
                'is-image-loaded': item.isImageLoaded,
                'is-image-failed': item.isImageFailed
              }"
              :style="{ '--reward-accent': item.accent }"
            >
              <span
                v-if="item.isImageLoading && !item.isImageLoaded"
                class="reward-image-skeleton"
                aria-hidden="true"
              ></span>
              <img
                v-if="item.imageSrc"
                :src="item.imageSrc"
                :alt="item.name"
                decoding="async"
                @load="$emit('product-image-loaded', item.id)"
                @error="$emit('product-image-failed', item.id)"
              >
              <span v-else-if="item.isImageFailed || !item.imageFilename">{{ productInitial(item) }}</span>
            </div>

            <div class="reward-info">
              <strong>{{ item.name }}</strong>
              <span>{{ item.description }}</span>
              <em v-if="tier.showItemPoints || !tier.pointsTitle">{{ item.pointsRequired }} 分</em>
            </div>

            <button
              class="redeem-button"
              type="button"
              :class="{
                'is-confirming': pendingRedeemKey === rewardKey(item, item.pointsRequired),
                'is-loading': redeemingKey === rewardKey(item, item.pointsRequired),
                'is-error': failedRedeemKey === rewardKey(item, item.pointsRequired)
              }"
              :disabled="isRedeemButtonDisabled(item.pointsRequired)"
              @click="handleRedeemClick(item, item.pointsRequired)"
            >
              <Transition name="redeem-label" mode="out-in">
                <span
                  :key="redeemButtonText(item, item.pointsRequired)"
                  class="redeem-button-label"
                >
                  <span class="redeem-button-content">
                    <span>{{ redeemButtonText(item, item.pointsRequired) }}</span>
                    <span
                      v-if="redeemingKey === rewardKey(item, item.pointsRequired)"
                      class="redeem-spinner"
                      aria-hidden="true"
                    ></span>
                  </span>
                </span>
              </Transition>
              <span
                v-for="burst in rewardConfettiBurstsFor(item, item.pointsRequired)"
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
import { groupProductsByTier } from '../utils/shopProductTiers'

const REDEEM_REQUEST_DELAY = 1000
const MIN_REDEEMING_DURATION = 900

function wait(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

async function waitForMinRedeemingDuration(startedAt) {
  const elapsed = Date.now() - startedAt
  const remaining = MIN_REDEEMING_DURATION - elapsed

  if (remaining > 0) {
    await wait(remaining)
  }
}

export default {
  name: 'ShopPage',
  emits: ['retry-products', 'retry-point-flow', 'consume-success', 'product-image-loaded', 'product-image-failed'],
  props: {
    products: {
      type: Array,
      default: () => []
    },
    isProductLoading: {
      type: Boolean,
      default: false
    },
    productErrorMessage: {
      type: String,
      default: ''
    },
    pointRecords: {
      type: Array,
      default: () => []
    },
    initialAvailablePoints: {
      type: Number,
      default: 0
    },
    isPointFlowLoading: {
      type: Boolean,
      default: false
    },
    pointFlowErrorMessage: {
      type: String,
      default: ''
    },
    consumeProduct: {
      type: Function,
      default: null
    },
    isRedeemAvailable: {
      type: Boolean,
      default: false
    },
    redeemWindowMessage: {
      type: String,
      default: '正在确认兑换时间'
    },
    isNoActiveSeason: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      availablePoints: this.initialAvailablePoints,
      displayPoints: this.initialAvailablePoints,
      localPointRecords: [...this.pointRecords],
      isRecordView: false,
      pendingRedeemKey: '',
      pendingRedeemTimer: null,
      redeemingKey: '',
      failedRedeemKey: '',
      failedRedeemTimer: null,
      pointAnimationFrame: null,
      pointDeltas: [],
      pointDeltaTimers: [],
      rewardConfettiBursts: [],
      rewardConfettiTimers: []
    }
  },
  computed: {
    rewardTiers() {
      return groupProductsByTier(this.products)
    },
    sortedPointRecords() {
      return [...this.localPointRecords].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt))
    }
  },
  watch: {
    pointRecords(records) {
      this.localPointRecords = [...records]
    },
    initialAvailablePoints(points) {
      const nextPoints = Number(points) || 0
      const previousPoints = this.displayPoints

      this.availablePoints = nextPoints
      this.animatePoints(previousPoints, nextPoints)
    },
    isRedeemAvailable(isAvailable) {
      if (!isAvailable) {
        this.clearPendingRedeem()
      }
    }
  },
  methods: {
    rewardKey(item, points) {
      return `${points}-${item.id}`
    },
    productInitial(item) {
      return item.name?.trim().charAt(0) || '礼'
    },
    redeemButtonText(item, points) {
      const key = this.rewardKey(item, points)

      if (this.redeemingKey === key) {
        return '兑换中'
      }

      if (this.failedRedeemKey === key) {
        return '兑换失败'
      }

      if (!this.isRedeemAvailable) {
        return this.isNoActiveSeason ? '敬请期待' : '暂未开放'
      }

      if (this.availablePoints < points) {
        return '积分不足'
      }

      return this.pendingRedeemKey === key ? '确认兑换' : '兑换'
    },
    isRedeemButtonDisabled(points) {
      return !this.isRedeemAvailable || this.availablePoints < points || Boolean(this.redeemingKey)
    },
    handleRedeemClick(item, points) {
      if (this.isRedeemButtonDisabled(points)) {
        return
      }

      const key = this.rewardKey(item, points)
      this.clearFailedRedeem()

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
    clearPendingRedeem() {
      this.pendingRedeemKey = ''

      if (this.pendingRedeemTimer) {
        window.clearTimeout(this.pendingRedeemTimer)
        this.pendingRedeemTimer = null
      }
    },
    async redeemReward(item, points) {
      if (this.isRedeemButtonDisabled(points) || typeof this.consumeProduct !== 'function') {
        return
      }

      const key = this.rewardKey(item, points)
      this.redeemingKey = key
      this.clearPendingRedeem()

      const redeemStartedAt = Date.now()

      try {
        await wait(REDEEM_REQUEST_DELAY)
        const result = await this.consumeProduct(item)
        await waitForMinRedeemingDuration(redeemStartedAt)
        const nextPoints = Number(result?.pointsAfter)

        if (!Number.isNaN(nextPoints)) {
          this.$emit('consume-success', {
            product: item,
            result: {
              ...result,
              pointsAfter: nextPoints
            }
          })
        }

        this.launchPointDelta(points)
        this.launchRewardConfetti(key)
      } catch {
        await waitForMinRedeemingDuration(redeemStartedAt)
        this.failedRedeemKey = key

        if (this.failedRedeemTimer) {
          window.clearTimeout(this.failedRedeemTimer)
        }

        this.failedRedeemTimer = window.setTimeout(() => {
          this.failedRedeemKey = ''
          this.failedRedeemTimer = null
        }, 1600)
      } finally {
        if (this.redeemingKey === key) {
          this.redeemingKey = ''
        }
      }
    },
    clearFailedRedeem() {
      if (this.failedRedeemTimer) {
        window.clearTimeout(this.failedRedeemTimer)
        this.failedRedeemTimer = null
      }

      this.failedRedeemKey = ''
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
    },
    formatPointAmount(amount) {
      return amount > 0 ? `+${amount}` : String(amount)
    }
  },
  beforeUnmount() {
    if (this.pendingRedeemTimer) {
      window.clearTimeout(this.pendingRedeemTimer)
    }

    if (this.failedRedeemTimer) {
      window.clearTimeout(this.failedRedeemTimer)
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
  max-width: none;
  margin: 0;
  color: #68766d;
  font-size: 12px;
  line-height: 1.55;
  white-space: nowrap;
}

.shop-hero .redeem-window-hint {
  display: inline-flex;
  margin-top: 10px;
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(47, 143, 50, 0.1);
  color: #2f8f32;
  font-size: 11px;
  font-weight: 850;
  line-height: 1.35;
  white-space: normal;
}

.shop-hero .redeem-window-hint.is-unavailable {
  background: rgba(224, 90, 56, 0.1);
  color: #b04a3f;
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

.exchange-record-card.is-income .record-date-badge {
  background: rgba(114, 216, 79, 0.16);
  color: #2f8f32;
}

.exchange-record-card.is-expense .record-date-badge {
  background: rgba(32, 199, 181, 0.14);
  color: #159b8d;
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

.exchange-record-meta strong.is-income {
  color: #2f8f32;
}

.exchange-record-meta strong.is-expense {
  color: #e05a38;
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

.empty-records.is-error {
  color: #b04a3f;
  background: rgba(255, 111, 97, 0.06);
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

.empty-records button {
  min-height: 34px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  background: #17211b;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
}

.shop-product-status,
.empty-tier {
  min-height: 190px;
  padding: 26px 18px;
  border: 1px dashed rgba(23, 33, 27, 0.14);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.68);
  color: #68766d;
  display: grid;
  place-items: center;
  gap: 12px;
  text-align: center;
}

.shop-product-status span,
.empty-tier span {
  color: #17211b;
  font-size: 15px;
  font-weight: 950;
}

.shop-product-status.is-error {
  color: #b04a3f;
  background: rgba(255, 111, 97, 0.06);
}

.shop-product-status button {
  min-height: 34px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  background: #17211b;
  color: #fff;
  cursor: pointer;
  font-size: 12px;
  font-weight: 900;
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
}

.tier-heading h2 {
  margin: 0;
  font-size: 22px;
  line-height: 1.1;
  letter-spacing: 0;
  white-space: nowrap;
}

.tier-points-heading {
  color: #75c82f;
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  font-style: italic;
  transform: skewX(-6deg);
  transform-origin: left bottom;
}

.tier-points-heading span {
  font-size: 18px;
  font-style: italic;
  font-weight: 900;
}

.tier-points-heading strong {
  font-size: 36px;
  font-style: italic;
  font-weight: 950;
  line-height: 0.92;
}

.reward-grid {
  column-count: 2;
  column-gap: 12px;
}

.reward-tier.is-crazy-tier {
  position: relative;
  overflow: hidden;
  border-color: rgba(190, 112, 255, 0.22);
  background:
    radial-gradient(circle at 16% 10%, rgba(255, 126, 210, 0.22), transparent 34%),
    radial-gradient(circle at 86% 18%, rgba(165, 111, 255, 0.22), transparent 36%),
    radial-gradient(circle at 56% 94%, rgba(255, 206, 117, 0.16), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(252, 241, 255, 0.86)),
    #fff;
}

.reward-tier.is-crazy-tier::before {
  position: absolute;
  inset: -48%;
  pointer-events: none;
  content: '';
  background: conic-gradient(
    from 0deg,
    rgba(255, 126, 210, 0.22),
    rgba(165, 111, 255, 0.2),
    rgba(255, 206, 117, 0.14),
    rgba(255, 126, 210, 0.22)
  );
  filter: blur(28px);
  opacity: 0.72;
  animation: crazy-aura-flow 9s linear infinite;
}

.reward-tier.is-crazy-tier .tier-heading {
  position: relative;
  z-index: 1;
}

.reward-tier.is-crazy-tier .reward-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr;
  column-count: auto;
}

.reward-card {
  width: 100%;
  margin: 0 0 12px;
  break-inside: avoid;
  padding: 10px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 250, 245, 0.72)),
    #fff;
  display: inline-flex;
  flex-direction: column;
  gap: 10px;
  vertical-align: top;
}

.reward-card:last-child {
  margin-bottom: 0;
}

.reward-tier.is-crazy-tier .reward-card {
  position: relative;
  overflow: hidden;
  min-height: 132px;
  padding: 12px;
  border-color: rgba(204, 145, 28, 0.2);
  border-radius: 24px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 250, 235, 0.86)),
    #fff;
  box-shadow:
    0 16px 32px rgba(154, 106, 16, 0.11),
    inset 0 0 0 1px rgba(255, 224, 137, 0.26);
  display: grid;
  grid-template-columns: 116px minmax(0, 1fr);
  grid-template-rows: 1fr auto;
  align-items: stretch;
  column-gap: 12px;
  row-gap: 10px;
}

.reward-tier.is-crazy-tier .reward-card::after {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -38%;
  width: 32%;
  pointer-events: none;
  content: '';
  background: linear-gradient(100deg, transparent, rgba(255, 234, 165, 0.44), transparent);
  transform: skewX(-14deg);
  animation: crazy-card-glint 3.8s ease-in-out infinite;
}

.reward-visual {
  position: relative;
  min-height: 96px;
  overflow: hidden;
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

.reward-visual.is-image-loading {
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.42),
    inset 0 -18px 38px rgba(255, 255, 255, 0.28);
}

.reward-visual img {
  position: relative;
  z-index: 2;
  width: 100%;
  height: auto;
  object-fit: contain;
  display: block;
  opacity: 0;
  filter: saturate(0.86) blur(8px);
  clip-path: inset(48% 42% 48% 42% round 18px);
  transform: translateY(10px) scale(0.88, 0.74);
  transform-origin: center;
  transition:
    opacity 0.52s ease,
    filter 0.52s ease,
    transform 0.52s cubic-bezier(0.16, 0.9, 0.28, 1);
  will-change: clip-path, filter, opacity, transform;
}

.reward-visual.is-image-loaded img {
  opacity: 1;
  filter: saturate(1) blur(0);
  clip-path: inset(0 round 0);
  transform: translateY(0) scale(1);
  animation: reward-image-elastic-reveal 760ms cubic-bezier(0.18, 0.88, 0.22, 1) both;
}

.reward-image-skeleton {
  position: absolute;
  z-index: 1;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.64), rgba(255, 255, 255, 0.2)),
    color-mix(in srgb, var(--reward-accent), #fff 80%);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.46),
    inset 0 16px 30px rgba(255, 255, 255, 0.34),
    inset 0 -18px 34px color-mix(in srgb, var(--reward-accent), transparent 68%);
  backdrop-filter: blur(18px) saturate(1.35);
  -webkit-backdrop-filter: blur(18px) saturate(1.35);
  pointer-events: none;
}

.reward-image-skeleton::before,
.reward-image-skeleton::after {
  position: absolute;
  content: '';
  pointer-events: none;
}

.reward-image-skeleton::before {
  inset: -28%;
  background:
    linear-gradient(
      115deg,
      transparent 14%,
      rgba(255, 255, 255, 0.42) 28%,
      transparent 43%,
      rgba(255, 255, 255, 0.26) 58%,
      transparent 74%
    ),
    radial-gradient(circle at 24% 32%, rgba(255, 255, 255, 0.46), transparent 30%),
    radial-gradient(circle at 82% 66%, color-mix(in srgb, var(--reward-accent), transparent 42%), transparent 28%);
  filter: blur(12px);
  opacity: 0.86;
  transform: translate3d(-18%, -8%, 0) rotate(0.001deg);
  animation: reward-glass-flow 2.8s ease-in-out infinite;
}

.reward-image-skeleton::after {
  inset: 10px;
  border-radius: 16px;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.24), transparent 30%, rgba(255, 255, 255, 0.3) 54%, transparent),
    linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.06));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.44),
    inset 0 -1px 0 rgba(255, 255, 255, 0.16);
  transform: translateX(-120%) skewX(-14deg);
  animation: reward-glass-sheen 1.32s ease-in-out infinite;
}

@keyframes reward-glass-flow {
  0%,
  100% {
    transform: translate3d(-18%, -8%, 0) rotate(0.001deg);
  }

  50% {
    transform: translate3d(16%, 8%, 0) rotate(0.001deg);
  }
}

@keyframes reward-glass-sheen {
  100% {
    transform: translateX(120%) skewX(-14deg);
  }
}

@keyframes reward-image-elastic-reveal {
  0% {
    opacity: 0;
    filter: saturate(0.9) blur(9px);
    clip-path: inset(50% 42% 50% 42% round 18px);
    transform: translateY(10px) scale(0.86, 0.7);
  }

  48% {
    opacity: 1;
    filter: saturate(1.04) blur(0);
    clip-path: inset(0 round 8px);
    transform: translateY(0) scale(1.045, 0.965);
  }

  68% {
    clip-path: inset(0 round 0);
    transform: translateY(0) scale(0.982, 1.018);
  }

  84% {
    transform: translateY(0) scale(1.012, 0.992);
  }

  100% {
    opacity: 1;
    filter: saturate(1) blur(0);
    clip-path: inset(0 round 0);
    transform: translateY(0) scale(1);
  }
}

.reward-tier.is-crazy-tier .reward-visual {
  min-height: 108px;
  grid-row: 1 / 3;
  box-shadow: inset 0 0 0 1px rgba(255, 224, 137, 0.22);
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

.reward-tier.is-crazy-tier .reward-info {
  min-height: 0;
  align-self: center;
}

.reward-info strong {
  display: block;
  overflow: hidden;
  color: #17211b;
  font-size: 14px;
  font-weight: 950;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.reward-info span {
  min-height: 30px;
  overflow: hidden;
  margin-top: 4px;
  color: #758078;
  display: -webkit-box;
  font-size: 11px;
  font-weight: 750;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.reward-info em {
  display: block;
  margin-top: 6px;
  color: #159b8d;
  font-size: 12px;
  font-style: normal;
  font-weight: 950;
}

.reward-tier.is-crazy-tier .reward-info strong {
  font-size: 16px;
}

.reward-tier.is-crazy-tier .reward-info span {
  min-height: 32px;
  font-size: 12px;
}

.reward-tier.is-crazy-tier .reward-info em {
  color: #b98512;
  font-size: 13px;
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

.reward-tier.is-crazy-tier .redeem-button {
  min-height: 38px;
  min-width: 108px;
  margin-top: 0;
  padding: 0 20px;
  border-radius: 999px;
  background: linear-gradient(135deg, #f6d66f, #c89219 52%, #a96f07);
  box-shadow:
    0 12px 24px rgba(174, 119, 16, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.44);
  color: #fffdf4;
  justify-self: end;
  align-self: end;
}

.reward-tier.is-crazy-tier .redeem-button:disabled {
  background: rgba(23, 33, 27, 0.12);
  box-shadow: none;
  color: rgba(23, 33, 27, 0.42);
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

.redeem-button.is-loading {
  background: linear-gradient(135deg, #e8f7ff, #bfe8ff);
  color: #17445f;
  box-shadow:
    0 12px 24px rgba(40, 151, 220, 0.18),
    inset 0 -2px 0 rgba(23, 68, 95, 0.08);
  cursor: wait;
}

.redeem-button.is-error {
  background: linear-gradient(135deg, #ff7a45, #d94d3f);
  box-shadow: 0 12px 24px rgba(217, 77, 63, 0.22);
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

@keyframes crazy-aura-flow {
  to {
    transform: rotate(360deg);
  }
}

@keyframes crazy-card-glint {
  0%,
  42% {
    left: -38%;
  }

  76%,
  100% {
    left: 108%;
  }
}

.redeem-button-label {
  display: inline-block;
  min-width: 52px;
}

.redeem-button-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
}

.redeem-spinner {
  flex: 0 0 auto;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(23, 68, 95, 0.22);
  border-top-color: #17445f;
  border-radius: 50%;
  animation: redeem-spinner-rotate 720ms linear infinite;
}

@keyframes redeem-spinner-rotate {
  to {
    transform: rotate(360deg);
  }
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

.redeem-button.is-loading:disabled {
  background: linear-gradient(135deg, #e8f7ff, #bfe8ff);
  box-shadow:
    0 12px 24px rgba(40, 151, 220, 0.18),
    inset 0 -2px 0 rgba(23, 68, 95, 0.08);
  color: #17445f;
  cursor: wait;
  opacity: 1;
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
