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
  </section>
</template>

<script>
import { challengeRules } from '../state/challengeConfig'

export default {
  name: 'ProjectDetail',
  data() {
    return {
      isLockConfirming: false,
      lockConfirmTimer: null,
      lockConfettiBursts: [],
      lockConfettiTimers: []
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
    }
  },
  beforeUnmount() {
    if (this.lockConfirmTimer) {
      window.clearTimeout(this.lockConfirmTimer)
    }

    this.lockConfettiTimers.forEach(timer => window.clearTimeout(timer))
  },
  emits: ['lock-task']
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

</style>
