<template>
  <Teleport to="body">
    <div class="suggestion-overlay" role="presentation" @click.self="requestClose">
      <aside class="suggestion-panel" role="dialog" aria-modal="true" aria-labelledby="suggestion-panel-title">
        <header class="suggestion-panel-header">
          <div>
            <span>YOUR VOICE</span>
            <h2 id="suggestion-panel-title">意见收集</h2>
          </div>
          <button type="button" aria-label="关闭意见收集" :disabled="isSubmitting" @click="requestClose">×</button>
        </header>

        <template v-if="isSubmitted">
          <div class="suggestion-success">
            <span aria-hidden="true">✓</span>
            <strong>感谢你的建议</strong>
            <p>我们会认真阅读，并持续优化活动体验。</p>
          </div>
        </template>

        <form v-else class="suggestion-form" @submit.prevent="handleSubmitClick">
          <label>
            <span>你希望我们做得更好的地方</span>
            <textarea
              ref="remarkInput"
              v-model="remark"
              :disabled="isSubmitting"
              placeholder="例如：希望增加活动提醒功能"
              @input="handleRemarkInput"
            ></textarea>
          </label>

          <p v-if="validationMessage" class="suggestion-validation">{{ validationMessage }}</p>
          <p v-else-if="submitErrorMessage" class="suggestion-error">{{ submitErrorMessage }}</p>
          <p v-else class="suggestion-hint">建议尽量具体，方便我们理解你的需求。</p>

          <button
            type="submit"
            class="suggestion-submit"
            :class="{
              'is-confirming': isSubmitConfirming,
              'is-submitting': isSubmitting,
              'is-failed': isSubmitFailed
            }"
            :disabled="isSubmitDisabled"
          >
            <span>{{ submitButtonText }}</span>
            <i v-if="isSubmitting" aria-hidden="true"></i>
          </button>
        </form>
      </aside>
    </div>
  </Teleport>
</template>

<script>
import { submitSuggestionRemark } from '../api/suggestion'

const SUBMIT_CONFIRM_DURATION = 1800
const SUBMIT_SUCCESS_CLOSE_DURATION = 1250

export default {
  name: 'SuggestionPanel',
  emits: ['close'],
  data() {
    return {
      remark: '',
      isSubmitConfirming: false,
      isSubmitting: false,
      isSubmitFailed: false,
      isSubmitted: false,
      submitErrorMessage: '',
      submitConfirmTimer: null,
      submitSuccessCloseTimer: null,
      previousBodyOverflow: ''
    }
  },
  computed: {
    normalizedRemark() {
      return this.remark.trim()
    },
    validationMessage() {
      return this.remark && !this.normalizedRemark ? '建议内容不能仅包含空白字符' : ''
    },
    isSubmitDisabled() {
      return !this.normalizedRemark || this.isSubmitting || this.isSubmitted
    },
    submitButtonText() {
      if (this.isSubmitting) {
        return '提交中'
      }

      if (this.isSubmitConfirming) {
        return '再次点击确认'
      }

      if (this.isSubmitFailed) {
        return '重新提交'
      }

      return '提交建议'
    }
  },
  mounted() {
    this.previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', this.handleKeydown)

    this.$nextTick(() => {
      this.$refs.remarkInput?.focus()
    })
  },
  methods: {
    handleRemarkInput() {
      this.isSubmitConfirming = false
      this.isSubmitFailed = false
      this.submitErrorMessage = ''

      if (this.submitConfirmTimer) {
        window.clearTimeout(this.submitConfirmTimer)
        this.submitConfirmTimer = null
      }
    },
    handleSubmitClick() {
      if (!this.normalizedRemark || this.isSubmitting || this.isSubmitted) {
        return
      }

      if (!this.isSubmitConfirming && !this.isSubmitFailed) {
        this.startSubmitConfirm()
        return
      }

      this.submitRemark()
    },
    startSubmitConfirm() {
      this.isSubmitConfirming = true

      if (this.submitConfirmTimer) {
        window.clearTimeout(this.submitConfirmTimer)
      }

      this.submitConfirmTimer = window.setTimeout(() => {
        this.isSubmitConfirming = false
        this.submitConfirmTimer = null
      }, SUBMIT_CONFIRM_DURATION)
    },
    async submitRemark() {
      this.isSubmitConfirming = false
      this.isSubmitFailed = false
      this.submitErrorMessage = ''

      if (this.submitConfirmTimer) {
        window.clearTimeout(this.submitConfirmTimer)
        this.submitConfirmTimer = null
      }

      this.isSubmitting = true

      try {
        await submitSuggestionRemark(this.normalizedRemark)
        this.isSubmitted = true
        this.remark = ''
        this.submitSuccessCloseTimer = window.setTimeout(() => {
          this.requestClose()
        }, SUBMIT_SUCCESS_CLOSE_DURATION)
      } catch (error) {
        this.isSubmitFailed = true
        this.submitErrorMessage = error.message || '提交失败，请稍后重试'
      } finally {
        this.isSubmitting = false
      }
    },
    requestClose() {
      if (!this.isSubmitting) {
        this.$emit('close')
      }
    },
    handleKeydown(event) {
      if (event.key === 'Escape') {
        this.requestClose()
      }
    }
  },
  beforeUnmount() {
    document.body.style.overflow = this.previousBodyOverflow
    window.removeEventListener('keydown', this.handleKeydown)

    if (this.submitConfirmTimer) {
      window.clearTimeout(this.submitConfirmTimer)
    }

    if (this.submitSuccessCloseTimer) {
      window.clearTimeout(this.submitSuccessCloseTimer)
    }
  }
}
</script>

<style scoped>
.suggestion-overlay {
  position: fixed;
  z-index: 110;
  inset: 0;
  width: min(100vw, 430px);
  margin: 0 auto;
  padding:
    max(14px, env(safe-area-inset-top))
    14px
    max(14px, env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: rgba(18, 27, 21, 0.42);
  display: flex;
  backdrop-filter: blur(6px);
}

.suggestion-panel {
  align-self: center;
  width: 100%;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.74);
  border-radius: 30px;
  box-sizing: border-box;
  background:
    radial-gradient(circle at 86% 8%, rgba(255, 131, 209, 0.2), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 248, 253, 0.94));
  box-shadow: 0 26px 64px rgba(23, 33, 27, 0.3);
  color: #17211b;
}

.suggestion-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.suggestion-panel-header span {
  color: #d34499;
  display: block;
  font-size: 9px;
  font-weight: 950;
  letter-spacing: 0.16em;
}

.suggestion-panel-header h2 {
  margin: 5px 0 0;
  font-size: 22px;
  line-height: 1.1;
  letter-spacing: -0.04em;
}

.suggestion-panel-header button {
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  border: 0;
  border-radius: 14px;
  background: rgba(23, 33, 27, 0.06);
  color: #17211b;
  cursor: pointer;
  font-size: 24px;
  line-height: 1;
}

.suggestion-panel-header button:disabled {
  cursor: wait;
  opacity: 0.5;
}

.suggestion-form {
  margin-top: 22px;
}

.suggestion-form label > span {
  color: #526057;
  display: block;
  font-size: 12px;
  font-weight: 900;
}

.suggestion-form textarea {
  width: 100%;
  min-height: 132px;
  margin-top: 9px;
  padding: 12px;
  border: 1px solid rgba(23, 33, 27, 0.1);
  border-radius: 18px;
  box-sizing: border-box;
  outline: none;
  background: rgba(255, 255, 255, 0.78);
  color: #17211b;
  font: inherit;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.suggestion-form textarea::placeholder {
  color: #a0aaa4;
}

.suggestion-form textarea:focus {
  border-color: rgba(211, 68, 153, 0.4);
  box-shadow: 0 0 0 4px rgba(255, 131, 209, 0.12);
}

.suggestion-form textarea:disabled {
  cursor: wait;
  opacity: 0.72;
}

.suggestion-hint,
.suggestion-validation,
.suggestion-error {
  min-height: 18px;
  margin: 8px 0 0;
  font-size: 11px;
  font-weight: 750;
  line-height: 1.45;
}

.suggestion-hint {
  color: #7c887f;
}

.suggestion-validation,
.suggestion-error {
  color: #d94d6a;
}

.suggestion-submit {
  width: 100%;
  min-height: 46px;
  margin-top: 14px;
  border: 0;
  border-radius: 17px;
  background: linear-gradient(135deg, #f06db8, #d34499);
  box-shadow: 0 12px 24px rgba(211, 68, 153, 0.24);
  color: #fff;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font: inherit;
  font-size: 14px;
  font-weight: 950;
  transition: box-shadow 0.18s ease, filter 0.18s ease, transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.suggestion-submit:not(:disabled):active {
  box-shadow: inset 0 3px 8px rgba(23, 33, 27, 0.16);
  filter: brightness(0.98);
  transform: translateY(2px) scale(0.98);
}

.suggestion-submit.is-confirming {
  background: linear-gradient(135deg, #ffb84d, #ff7a45);
  box-shadow:
    0 12px 24px rgba(255, 122, 69, 0.26),
    0 0 0 4px rgba(255, 184, 77, 0.16);
}

.suggestion-submit.is-submitting {
  background: linear-gradient(135deg, #e8f7ff, #bfe8ff);
  box-shadow: 0 12px 24px rgba(40, 151, 220, 0.18);
  color: #17445f;
  cursor: wait;
}

.suggestion-submit.is-failed {
  background: linear-gradient(135deg, #ff8f8f, #ff5c5c);
  box-shadow: 0 12px 24px rgba(255, 92, 92, 0.24);
}

.suggestion-submit:disabled {
  cursor: not-allowed;
  opacity: 0.58;
  box-shadow: none;
}

.suggestion-submit.is-submitting:disabled,
.suggestion-submit.is-failed:disabled {
  opacity: 1;
}

.suggestion-submit i {
  width: 13px;
  height: 13px;
  border: 2px solid rgba(23, 68, 95, 0.22);
  border-top-color: #17445f;
  border-radius: 50%;
  animation: suggestion-spinner 720ms linear infinite;
}

.suggestion-success {
  min-height: 218px;
  padding: 24px 12px 6px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.suggestion-success > span {
  width: 48px;
  height: 48px;
  border-radius: 18px;
  background: linear-gradient(135deg, #70dd4d, #39b54a);
  box-shadow: 0 12px 22px rgba(58, 181, 74, 0.24);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 25px;
  font-weight: 950;
}

.suggestion-success strong {
  margin-top: 14px;
  font-size: 18px;
}

.suggestion-success p {
  max-width: 230px;
  margin: 7px 0 0;
  color: #68766d;
  font-size: 12px;
  font-weight: 750;
  line-height: 1.6;
}

@keyframes suggestion-spinner {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .suggestion-form textarea,
  .suggestion-submit,
  .suggestion-submit i {
    animation: none;
    transition: none;
  }
}
</style>
