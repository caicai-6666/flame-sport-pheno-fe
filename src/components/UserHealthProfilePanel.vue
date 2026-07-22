<template>
  <Teleport to="body">
    <div class="profile-panel-backdrop" role="presentation">
      <section class="profile-panel" role="dialog" aria-modal="true" aria-label="健康信息采集">
        <div class="profile-panel-header">
          <span>HEALTH BASELINE</span>
          <h2>完善健康基线</h2>
          <p>用于辅助赛季健康评估。</p>
        </div>

        <div class="profile-picker-group" :class="{ 'is-single': visiblePickerCount === 1 }">
          <div v-if="shouldRenderHeightPicker" class="profile-picker">
            <div class="profile-picker-heading">
              <span>身高</span>
            </div>
            <div class="profile-wheel-shell">
              <div class="profile-wheel-highlight" aria-hidden="true"></div>
              <div
                ref="heightWheel"
                class="profile-wheel"
                role="listbox"
                tabindex="0"
                aria-label="选择身高"
                @scroll="handleWheelScroll('height')"
              >
                <div class="profile-wheel-spacer"></div>
                <button
                  v-for="height in heightOptions"
                  :key="height"
                  class="profile-wheel-option"
                  :class="{ 'is-selected': height === heightCm }"
                  type="button"
                  role="option"
                  :aria-selected="height === heightCm"
                  @click="selectHeight(height)"
                >
                  {{ formatHeight(height) }}
                </button>
                <div class="profile-wheel-spacer"></div>
              </div>
            </div>
          </div>

          <div v-if="shouldRenderAgePicker" class="profile-picker">
            <div class="profile-picker-heading">
              <span>年龄</span>
            </div>
            <div class="profile-wheel-shell">
              <div class="profile-wheel-highlight" aria-hidden="true"></div>
              <div
                ref="ageWheel"
                class="profile-wheel"
                role="listbox"
                tabindex="0"
                aria-label="选择年龄"
                @scroll="handleWheelScroll('age')"
              >
                <div class="profile-wheel-spacer"></div>
                <button
                  v-for="ageOption in ageOptions"
                  :key="ageOption"
                  class="profile-wheel-option"
                  :class="{ 'is-selected': ageOption === age }"
                  type="button"
                  role="option"
                  :aria-selected="ageOption === age"
                  @click="selectAge(ageOption)"
                >
                  {{ ageOption }} 岁
                </button>
                <div class="profile-wheel-spacer"></div>
              </div>
            </div>
          </div>
        </div>

        <button
          class="profile-submit"
          type="button"
          :class="{
            'is-confirming': isSubmitConfirming,
            'is-saving': isSaving,
            'is-failed': isSubmitFailed
          }"
          :disabled="isSubmitDisabled"
          @click="handleSubmitClick"
        >
          <Transition name="profile-submit-label" mode="out-in">
            <span :key="submitButtonText" class="profile-submit-label">
              <span class="profile-submit-content">
                <span>{{ submitButtonText }}</span>
                <span
                  v-if="isSaving"
                  class="profile-submit-spinner"
                  aria-hidden="true"
                ></span>
              </span>
            </span>
          </Transition>
        </button>
      </section>
    </div>
  </Teleport>
</template>

<script>
const MIN_HEIGHT_CM = 120
const MAX_HEIGHT_CM = 220
const HEIGHT_STEP_CM = 0.25
const DEFAULT_HEIGHT_CM = 170
const MIN_AGE = 18
const MAX_AGE = 99
const DEFAULT_AGE = 30
const WHEEL_OPTION_HEIGHT = 38

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export default {
  name: 'UserHealthProfilePanel',
  emits: ['submit'],
  props: {
    missingFields: {
      type: Array,
      default: () => []
    },
    isSaving: {
      type: Boolean,
      default: false
    },
    saveError: {
      type: [Object, String],
      default: null
    }
  },
  data() {
    return {
      heightCm: DEFAULT_HEIGHT_CM,
      age: DEFAULT_AGE,
      isSubmitConfirming: false,
      isSubmitFailed: false,
      submitConfirmTimer: null,
      submitFailureTimer: null,
      heightWheelTimer: null,
      ageWheelTimer: null
    }
  },
  computed: {
    heightOptions() {
      return Array.from(
        { length: Math.round((MAX_HEIGHT_CM - MIN_HEIGHT_CM) / HEIGHT_STEP_CM) + 1 },
        (_, index) => Number((MIN_HEIGHT_CM + index * HEIGHT_STEP_CM).toFixed(2))
      )
    },
    ageOptions() {
      return Array.from(
        { length: MAX_AGE - MIN_AGE + 1 },
        (_, index) => MIN_AGE + index
      )
    },
    normalizedMissingFields() {
      return this.missingFields.map(field => String(field))
    },
    shouldRenderHeightPicker() {
      return this.normalizedMissingFields.includes('height_cm')
    },
    shouldRenderAgePicker() {
      return this.normalizedMissingFields.includes('age') || this.normalizedMissingFields.includes('age_years')
    },
    visiblePickerCount() {
      return [this.shouldRenderHeightPicker, this.shouldRenderAgePicker].filter(Boolean).length
    },
    submitButtonText() {
      if (this.isSaving) {
        return '保存中'
      }

      if (this.isSubmitFailed) {
        return '保存失败'
      }

      return this.isSubmitConfirming ? '确认保存' : '保存并进入'
    },
    isSubmitDisabled() {
      return this.isSaving || this.isSubmitFailed || this.visiblePickerCount === 0
    }
  },
  watch: {
    saveError(error) {
      if (error) {
        this.showSubmitFailure()
      }
    }
  },
  mounted() {
    this.$nextTick(() => {
      if (this.shouldRenderHeightPicker) {
        this.scrollWheelToValue('height', this.heightCm, false)
      }

      if (this.shouldRenderAgePicker) {
        this.scrollWheelToValue('age', this.age, false)
      }
    })
  },
  methods: {
    formatHeight(height) {
      return `${Number(height).toFixed(2)} cm`
    },
    selectHeight(height) {
      this.heightCm = height
      this.scrollWheelToValue('height', height)
    },
    selectAge(age) {
      this.age = age
      this.scrollWheelToValue('age', age)
    },
    handleWheelScroll(type) {
      const timerName = type === 'height' ? 'heightWheelTimer' : 'ageWheelTimer'

      if (this[timerName]) {
        window.clearTimeout(this[timerName])
      }

      this[timerName] = window.setTimeout(() => {
        this.syncWheelSelection(type)
        this[timerName] = null
      }, 90)
    },
    syncWheelSelection(type) {
      const wheel = type === 'height' ? this.$refs.heightWheel : this.$refs.ageWheel
      const options = type === 'height' ? this.heightOptions : this.ageOptions

      if (!wheel || !options.length) {
        return
      }

      const selectedIndex = clamp(Math.round(wheel.scrollTop / WHEEL_OPTION_HEIGHT), 0, options.length - 1)
      const selectedValue = options[selectedIndex]

      if (type === 'height') {
        this.heightCm = selectedValue
      } else {
        this.age = selectedValue
      }

      this.scrollWheelToIndex(type, selectedIndex)
    },
    scrollWheelToValue(type, value, smooth = true) {
      const options = type === 'height' ? this.heightOptions : this.ageOptions
      const selectedIndex = options.findIndex(option => Math.abs(Number(option) - Number(value)) < 0.01)

      if (selectedIndex >= 0) {
        this.scrollWheelToIndex(type, selectedIndex, smooth)
      }
    },
    scrollWheelToIndex(type, index, smooth = true) {
      const wheel = type === 'height' ? this.$refs.heightWheel : this.$refs.ageWheel

      if (!wheel) {
        return
      }

      wheel.scrollTo({
        top: index * WHEEL_OPTION_HEIGHT,
        behavior: smooth ? 'smooth' : 'auto'
      })
    },
    handleSubmitClick() {
      if (this.isSubmitDisabled) {
        return
      }

      if (!this.isSubmitConfirming) {
        this.startSubmitConfirm()
        return
      }

      this.submitProfile()
    },
    startSubmitConfirm() {
      this.isSubmitConfirming = true

      if (this.submitConfirmTimer) {
        window.clearTimeout(this.submitConfirmTimer)
      }

      this.submitConfirmTimer = window.setTimeout(() => {
        this.isSubmitConfirming = false
        this.submitConfirmTimer = null
      }, 1800)
    },
    submitProfile() {
      const profile = {}

      if (this.shouldRenderHeightPicker) {
        profile.heightCm = this.heightCm
      }

      if (this.shouldRenderAgePicker) {
        profile.age = this.age
      }

      this.isSubmitConfirming = false

      if (this.submitConfirmTimer) {
        window.clearTimeout(this.submitConfirmTimer)
        this.submitConfirmTimer = null
      }

      this.$emit('submit', profile)
    },
    showSubmitFailure() {
      this.isSubmitConfirming = false
      this.isSubmitFailed = true

      if (this.submitConfirmTimer) {
        window.clearTimeout(this.submitConfirmTimer)
        this.submitConfirmTimer = null
      }

      if (this.submitFailureTimer) {
        window.clearTimeout(this.submitFailureTimer)
      }

      this.submitFailureTimer = window.setTimeout(() => {
        this.isSubmitFailed = false
        this.submitFailureTimer = null
      }, 1400)
    }
  },
  beforeUnmount() {
    if (this.submitConfirmTimer) {
      window.clearTimeout(this.submitConfirmTimer)
    }

    if (this.submitFailureTimer) {
      window.clearTimeout(this.submitFailureTimer)
    }

    if (this.heightWheelTimer) {
      window.clearTimeout(this.heightWheelTimer)
    }

    if (this.ageWheelTimer) {
      window.clearTimeout(this.ageWheelTimer)
    }
  }
}
</script>

<style scoped>
.profile-panel-backdrop {
  position: fixed;
  z-index: 80;
  inset: 0;
  padding: 22px;
  background: rgba(18, 28, 22, 0.38);
  backdrop-filter: blur(14px);
  display: grid;
  place-items: center;
}

.profile-panel {
  position: relative;
  z-index: 2;
  width: min(100%, 390px);
  padding: 22px;
  border: 1px solid rgba(23, 33, 27, 0.1);
  border-radius: 30px;
  background:
    radial-gradient(circle at 88% 12%, rgba(32, 199, 181, 0.24), transparent 30%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(244, 251, 240, 0.94)),
    #fff;
  box-shadow: 0 26px 70px rgba(19, 42, 28, 0.24);
}

.profile-panel-header span {
  color: #159b8d;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 0.12em;
}

.profile-panel-header h2 {
  margin: 8px 0 8px;
  color: #17211b;
  font-size: 26px;
  line-height: 1.1;
  letter-spacing: 0;
}

.profile-panel-header p {
  margin: 0;
  color: #68766d;
  font-size: 13px;
  line-height: 1.65;
}

.profile-picker-group {
  margin: 20px 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.profile-picker-group.is-single {
  grid-template-columns: minmax(0, 1fr);
}

.profile-picker {
  min-width: 0;
  padding: 14px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: inset 0 -1px 0 rgba(23, 33, 27, 0.04);
}

.profile-picker-heading {
  margin-bottom: 10px;
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  gap: 8px;
}

.profile-picker-heading span {
  color: #68766d;
  font-size: 12px;
  font-weight: 900;
}

.profile-wheel-shell {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0)),
    rgba(241, 248, 238, 0.8);
}

.profile-wheel-shell::before,
.profile-wheel-shell::after {
  position: absolute;
  z-index: 2;
  right: 0;
  left: 0;
  height: 42px;
  pointer-events: none;
  content: '';
}

.profile-wheel-shell::before {
  top: 0;
  background: linear-gradient(180deg, rgba(249, 253, 247, 0.96), rgba(249, 253, 247, 0));
}

.profile-wheel-shell::after {
  bottom: 0;
  background: linear-gradient(0deg, rgba(249, 253, 247, 0.96), rgba(249, 253, 247, 0));
}

.profile-wheel-highlight {
  position: absolute;
  z-index: 1;
  top: 50%;
  right: 8px;
  left: 8px;
  height: 38px;
  border: 1px solid rgba(32, 199, 181, 0.18);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.62);
  box-shadow: 0 8px 18px rgba(32, 199, 181, 0.1);
  transform: translateY(-50%);
}

.profile-wheel {
  position: relative;
  z-index: 3;
  height: 150px;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.profile-wheel::-webkit-scrollbar {
  display: none;
}

.profile-wheel:focus-visible {
  outline: 3px solid rgba(32, 199, 181, 0.28);
  outline-offset: 3px;
}

.profile-wheel-spacer {
  height: 56px;
}

.profile-wheel-option {
  width: 100%;
  height: 38px;
  border: 0;
  background: transparent;
  color: rgba(23, 33, 27, 0.44);
  cursor: pointer;
  display: block;
  font-size: 16px;
  font-weight: 850;
  line-height: 38px;
  scroll-snap-align: center;
  text-align: center;
  transform: scale(0.94);
  transition:
    color 0.18s ease,
    font-size 0.18s ease,
    transform 0.18s ease;
}

.profile-wheel-option.is-selected {
  color: #17211b;
  font-size: 19px;
  font-weight: 950;
  transform: scale(1);
}

.profile-submit {
  position: relative;
  width: 100%;
  min-height: 46px;
  border: 0;
  border-radius: 18px;
  background: linear-gradient(135deg, #72d84f, #2f8f32);
  color: #fff;
  box-shadow: 0 14px 24px rgba(47, 143, 50, 0.22);
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

.profile-submit:not(:disabled):hover {
  box-shadow: 0 16px 28px rgba(47, 143, 50, 0.26);
  filter: brightness(1.03);
  transform: translateY(-2px) scale(1.01);
}

.profile-submit:not(:disabled):active {
  box-shadow:
    0 6px 14px rgba(47, 143, 50, 0.22),
    inset 0 3px 8px rgba(23, 33, 27, 0.14);
  filter: brightness(0.98);
  transform: translateY(2px) scale(0.97);
  transition-duration: 0.08s;
}

.profile-submit.is-confirming {
  background: linear-gradient(135deg, #ffb84d, #ff7a45);
  box-shadow:
    0 12px 24px rgba(255, 122, 69, 0.28),
    0 0 0 4px rgba(255, 184, 77, 0.18);
  animation: profile-submit-confirm-pulse 1.1s ease-in-out infinite;
}

.profile-submit.is-saving {
  background: linear-gradient(135deg, #e8f7ff, #bfe8ff);
  color: #17445f;
  box-shadow:
    0 12px 24px rgba(40, 151, 220, 0.18),
    inset 0 -2px 0 rgba(23, 68, 95, 0.08);
  cursor: wait;
}

.profile-submit.is-failed {
  background: linear-gradient(135deg, #ff8f8f, #ff5c5c);
  box-shadow:
    0 12px 24px rgba(255, 92, 92, 0.24),
    0 0 0 4px rgba(255, 92, 92, 0.14);
}

@keyframes profile-submit-confirm-pulse {
  0%,
  100% {
    filter: brightness(1);
  }

  50% {
    filter: brightness(1.08);
  }
}

.profile-submit-label {
  display: inline-block;
  min-width: 72px;
}

.profile-submit-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.profile-submit-spinner {
  flex: 0 0 auto;
  width: 13px;
  height: 13px;
  border: 2px solid rgba(23, 68, 95, 0.22);
  border-top-color: #17445f;
  border-radius: 50%;
  animation: profile-submit-spinner-rotate 720ms linear infinite;
}

@keyframes profile-submit-spinner-rotate {
  to {
    transform: rotate(360deg);
  }
}

.profile-submit-label-enter-active,
.profile-submit-label-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.profile-submit-label-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.96);
}

.profile-submit-label-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}

.profile-submit:focus-visible {
  outline: 3px solid rgba(32, 199, 181, 0.28);
  outline-offset: 3px;
}

.profile-submit:disabled {
  cursor: not-allowed;
  opacity: 0.72;
  box-shadow: none;
  transform: none;
}

.profile-submit.is-saving:disabled,
.profile-submit.is-failed:disabled {
  opacity: 1;
  box-shadow:
    0 12px 24px rgba(40, 151, 220, 0.18),
    inset 0 -2px 0 rgba(23, 68, 95, 0.08);
}

.profile-submit.is-failed:disabled {
  box-shadow:
    0 12px 24px rgba(255, 92, 92, 0.24),
    0 0 0 4px rgba(255, 92, 92, 0.14);
}
</style>
