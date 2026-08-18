<template>
  <article
    class="supplement-record-shell"
    :class="{ 'is-editing': isEditing }"
    :style="cardHeight ? { height: `${cardHeight}px` } : undefined"
  >
    <div class="supplement-record-flipper">
      <section
        ref="frontFace"
        class="supplement-record-face is-front"
        :aria-hidden="isEditing"
        :inert="isEditing"
      >
        <div class="supplement-record-top">
          <div>
            <span>{{ record.seasonName }}</span>
            <strong>{{ record.taskName }}</strong>
          </div>
          <div class="supplement-record-actions">
            <button
              class="open-supplement-button"
              type="button"
              :disabled="isWriteFrozen || !projectId"
              @click="openEditor"
            >
              补传
            </button>
            <em :class="`is-${record.result}`">{{ resultText }}</em>
          </div>
        </div>

        <p v-if="record.note">{{ record.note }}</p>
        <p v-if="record.reviewComment" class="supplement-review-comment">
          <span>审核意见</span>
          {{ record.reviewComment }}
        </p>

        <dl class="supplement-record-meta">
          <div>
            <dt>运动日期</dt>
            <dd>{{ record.proofDate || '--' }}</dd>
          </div>
          <div>
            <dt>上传文件</dt>
            <dd>{{ record.fileName }}</dd>
          </div>
          <div>
            <dt>上传时间</dt>
            <dd>{{ formattedUploadedAt }}</dd>
          </div>
        </dl>

        <button
          v-if="canPreviewOriginal"
          class="view-original-button"
          type="button"
          @click="$emit('preview', record)"
        >
          查看原凭证
          <span aria-hidden="true">↗</span>
        </button>
      </section>

      <section
        ref="backFace"
        class="supplement-record-face is-back"
        :aria-hidden="!isEditing"
        :inert="!isEditing"
      >
        <header class="supplement-editor-header">
          <div>
            <span>SUPPLEMENT PROOF</span>
            <h3>补传{{ record.taskName }}记录</h3>
          </div>
          <button type="button" aria-label="返回记录" :disabled="isUploading" @click="closeEditor">×</button>
        </header>

        <div class="supplement-context" aria-label="补传记录上下文">
          <span>{{ record.seasonName }}</span>
          <strong>{{ record.proofDate }}</strong>
        </div>

        <form class="supplement-form" @submit.prevent="submitSupplement">
          <label
            class="supplement-dropzone"
            :class="{
              'has-preview': previewUrl,
              'is-processing': isProcessing
            }"
          >
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              multiple
              :disabled="isWriteFrozen || isProcessing || isUploading"
              @change="handleImageSelection"
            >
            <template v-if="previewUrl">
              <img :src="previewUrl" :alt="`${record.taskName}补传图片预览`">
              <span>{{ selectedImageCount > 1 ? `已拼接 ${selectedImageCount} 张 · 更换` : '更换图片' }}</span>
            </template>
            <template v-else>
              <b aria-hidden="true">＋</b>
              <strong>{{ isProcessing ? '正在处理图片' : '选择补传图片' }}</strong>
              <small>仅支持图片 · 最多 5 张 · 多图自动纵向拼接</small>
            </template>
          </label>

          <p v-if="configError" class="supplement-form-error">上传配置加载失败，请关闭后重试。</p>
          <p v-if="processError" class="supplement-form-error">{{ processError }}</p>

          <button
            v-if="processedBlob"
            class="view-processed-button"
            type="button"
            :disabled="isUploading"
            @click="isPreviewingProcessed = true"
          >
            {{ selectedImageCount > 1 ? `查看 ${selectedImageCount} 张拼接结果` : '查看处理后的图片' }}
            <span aria-hidden="true">↗</span>
          </button>

          <label class="supplement-note">
            <span>补传备注</span>
            <textarea
              v-model.trim="note"
              maxlength="80"
              placeholder="请填写时长、距离、次数或步数等可核验信息"
              required
              :disabled="isWriteFrozen || isUploading"
              @input="resetConfirmation"
            ></textarea>
            <small>{{ note.length }}/80 · 原赛季、项目与运动日期不可修改</small>
          </label>

          <p v-if="isWriteFrozen" class="supplement-form-notice">赛季尚未正式开始，当前仅支持查看。</p>
          <p v-else-if="uploadError" class="supplement-form-error">{{ uploadError }}</p>

          <button
            class="submit-supplement-button"
            type="submit"
            :class="{
              'is-confirming': isConfirming,
              'is-uploading': isUploading,
              'is-succeeded': isUploadSucceeded
            }"
            :disabled="!canSubmit"
          >
            <Transition name="submit-supplement-label" mode="out-in">
              <span :key="submitButtonText" class="submit-supplement-label">
                {{ submitButtonText }}
              </span>
            </Transition>
          </button>
        </form>
      </section>
    </div>

    <ProofImageViewer
      v-if="isPreviewingProcessed && processedBlob"
      :image-blob="processedBlob"
      :file-name="finalFileName"
      @close="isPreviewingProcessed = false"
    />
  </article>
</template>

<script>
import { getProjectUploadConfig } from '../api/projects'
import { uploadSupplementProof } from '../api/history'
import {
  composeProofImagesToWebp,
  compressImageToWebp,
  getProofFileBaseName,
  MAX_PROOF_IMAGE_COUNT,
  PROOF_IMAGE_MIME_TYPE,
  sanitizeProofFileBaseName,
  toProofWebpFileName
} from '../utils/proofImageProcessing'
import { getReviewStatusText } from '../utils/proofReview'
import ProofImageViewer from './ProofImageViewer.vue'

const CONFIRMATION_DURATION = 2200

export default {
  name: 'SupplementRecordCard',
  components: {
    ProofImageViewer
  },
  emits: ['preview', 'submitted'],
  props: {
    record: {
      type: Object,
      required: true
    },
    projectTasks: {
      type: Array,
      default: () => []
    },
    isWriteFrozen: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      isEditing: false,
      cardHeight: 0,
      resizeObserver: null,
      uploadConfigs: [],
      isConfigLoading: false,
      configError: null,
      note: this.record.note || '',
      selectedImageCount: 0,
      fileBaseName: '',
      processedBlob: null,
      previewUrl: '',
      selectionToken: 0,
      isProcessing: false,
      processError: '',
      isPreviewingProcessed: false,
      isConfirming: false,
      confirmationTimer: null,
      isUploading: false,
      isUploadSucceeded: false,
      uploadError: ''
    }
  },
  computed: {
    projectTask() {
      return this.projectTasks.find(task => task.name === this.record.taskName) || null
    },
    projectId() {
      return String(this.record.projectId || this.projectTask?.projectId || '')
    },
    selectedUploadConfig() {
      return this.uploadConfigs[0] || null
    },
    canPreviewOriginal() {
      return Boolean(this.record.imageUrl || this.record.temporaryImageBlob?.size)
    },
    resultText() {
      return getReviewStatusText(this.record.result)
    },
    formattedUploadedAt() {
      const date = new Date(this.record.uploadedAt)

      if (Number.isNaN(date.getTime())) {
        return '--'
      }

      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')

      return `${date.getFullYear()}.${month}.${day} ${hour}:${minute}`
    },
    finalFileName() {
      return toProofWebpFileName(this.fileBaseName)
    },
    canSubmit() {
      return Boolean(
        !this.isWriteFrozen &&
        !this.isConfigLoading &&
        !this.isProcessing &&
        !this.isUploading &&
        !this.isUploadSucceeded &&
        this.record.proofRecordId &&
        this.record.seasonId &&
        this.projectId &&
        this.record.proofDate &&
        this.selectedUploadConfig?.uploadConfigId &&
        this.note.trim() &&
        this.processedBlob &&
        this.fileBaseName
      )
    },
    submitButtonText() {
      if (this.isProcessing) {
        return '正在处理图片'
      }

      if (this.isUploading) {
        return '正在补传'
      }

      if (this.isUploadSucceeded) {
        return '补传成功'
      }

      return this.isConfirming ? '再次点击确认补传' : '补交凭证'
    }
  },
  mounted() {
    if (typeof ResizeObserver === 'function') {
      this.resizeObserver = new ResizeObserver(this.updateCardHeight)
      this.resizeObserver.observe(this.$refs.frontFace)
      this.resizeObserver.observe(this.$refs.backFace)
    }

    this.$nextTick(this.updateCardHeight)
  },
  beforeUnmount() {
    this.selectionToken += 1
    this.resizeObserver?.disconnect()
    this.clearPreviewUrl()
    this.resetConfirmation()
  },
  methods: {
    updateCardHeight() {
      const activeFace = this.isEditing ? this.$refs.backFace : this.$refs.frontFace
      const measuredHeight = Math.ceil(activeFace?.getBoundingClientRect().height || 0)

      if (measuredHeight) {
        this.cardHeight = measuredHeight
      }
    },
    async openEditor() {
      if (this.isWriteFrozen || !this.projectId) {
        return
      }

      this.isEditing = true
      this.uploadError = ''
      this.$nextTick(this.updateCardHeight)

      if (!this.uploadConfigs.length && !this.isConfigLoading) {
        await this.loadUploadConfig()
      }
    },
    closeEditor() {
      if (this.isUploading) {
        return
      }

      this.isEditing = false
      this.isPreviewingProcessed = false
      this.resetConfirmation()
      this.$nextTick(this.updateCardHeight)
    },
    async loadUploadConfig() {
      this.isConfigLoading = true
      this.configError = null

      try {
        const configs = await getProjectUploadConfig(this.projectId)

        if (!configs.length || !configs[0]?.uploadConfigId) {
          throw new Error('缺少项目上传配置')
        }

        // 补传表单按需求不开放记录类型选择，使用该项目当前首个启用配置。
        this.uploadConfigs = configs
      } catch (error) {
        this.uploadConfigs = []
        this.configError = error
      } finally {
        this.isConfigLoading = false
        this.$nextTick(this.updateCardHeight)
      }
    },
    clearPreviewUrl() {
      if (this.previewUrl) {
        URL.revokeObjectURL(this.previewUrl)
      }

      this.previewUrl = ''
    },
    async handleImageSelection(event) {
      const files = Array.from(event.target.files || [])

      if (!files.length) {
        return
      }

      if (files.length > MAX_PROOF_IMAGE_COUNT) {
        this.processError = `一次最多选择 ${MAX_PROOF_IMAGE_COUNT} 张图片`
        event.target.value = ''
        return
      }

      if (files.some(file => file.type && !file.type.startsWith('image/'))) {
        this.processError = '只能选择图片文件'
        event.target.value = ''
        return
      }

      const selectionToken = this.selectionToken + 1
      const [firstFile] = files
      this.selectionToken = selectionToken
      this.clearPreviewUrl()
      this.processedBlob = null
      this.selectedImageCount = files.length
      this.fileBaseName = sanitizeProofFileBaseName(
        files.length > 1
          ? `${getProofFileBaseName(firstFile.name)}-${files.length}张补传凭证`
          : getProofFileBaseName(firstFile.name)
      )
      this.isProcessing = true
      this.processError = ''
      this.uploadError = ''
      this.resetConfirmation()

      try {
        const blob = files.length === 1
          ? await compressImageToWebp(firstFile)
          : await composeProofImagesToWebp(files)

        if (selectionToken !== this.selectionToken) {
          return
        }

        this.processedBlob = blob
        this.previewUrl = URL.createObjectURL(blob)
      } catch (error) {
        if (selectionToken !== this.selectionToken) {
          return
        }

        this.processError = error.message || '图片处理失败，请重新选择图片'
        this.selectedImageCount = 0
        this.fileBaseName = ''
        this.processedBlob = null
        event.target.value = ''
      } finally {
        if (selectionToken === this.selectionToken) {
          this.isProcessing = false
          this.$nextTick(this.updateCardHeight)
        }
      }
    },
    async submitSupplement() {
      if (!this.canSubmit) {
        return
      }

      if (!this.isConfirming) {
        this.isConfirming = true
        this.confirmationTimer = window.setTimeout(() => {
          this.isConfirming = false
          this.confirmationTimer = null
        }, CONFIRMATION_DURATION)
        return
      }

      this.resetConfirmation()
      this.isUploading = true
      this.uploadError = ''

      try {
        const imageFile = new File([this.processedBlob], this.finalFileName, {
          type: PROOF_IMAGE_MIME_TYPE,
          lastModified: Date.now()
        })
        const result = await uploadSupplementProof({
          proofRecordId: this.record.proofRecordId,
          seasonId: this.record.seasonId,
          projectId: this.projectId,
          projectUploadConfigId: this.selectedUploadConfig.uploadConfigId,
          recordType: this.selectedUploadConfig.recordType,
          proofDate: this.record.proofDate,
          note: this.note,
          imageFile
        })

        this.isUploadSucceeded = true
        this.$emit('submitted', {
          proofRecordId: this.record.proofRecordId,
          result
        })
      } catch (error) {
        this.uploadError = error.message || '补传失败，请稍后重试'
      } finally {
        this.isUploading = false
        this.$nextTick(this.updateCardHeight)
      }
    },
    resetConfirmation() {
      this.isConfirming = false

      if (this.confirmationTimer) {
        window.clearTimeout(this.confirmationTimer)
        this.confirmationTimer = null
      }
    }
  }
}
</script>

<style scoped>
.supplement-record-shell {
  position: relative;
  width: 100%;
  min-height: 220px;
  perspective: 1400px;
  transition: height 0.62s cubic-bezier(0.2, 0.82, 0.2, 1);
}

.supplement-record-flipper {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.7s cubic-bezier(0.2, 0.82, 0.2, 1);
}

.supplement-record-shell.is-editing .supplement-record-flipper {
  transform: rotateY(-180deg);
}

.supplement-record-face {
  position: absolute;
  box-sizing: border-box;
  top: 0;
  left: 0;
  width: 100%;
  padding: 16px;
  border: 1px solid rgba(117, 68, 206, 0.24);
  border-radius: 28px;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.supplement-record-face.is-front {
  background:
    radial-gradient(circle at 92% 8%, rgba(255, 112, 67, 0.17), transparent 38%),
    linear-gradient(145deg, rgba(248, 244, 255, 0.99), rgba(241, 232, 255, 0.94) 58%, rgba(255, 244, 231, 0.96));
  box-shadow:
    0 2px 5px rgba(63, 31, 95, 0.07),
    0 10px 24px rgba(63, 31, 95, 0.16);
}

.supplement-record-face.is-front::before {
  position: absolute;
  top: 18px;
  bottom: 18px;
  left: 0;
  width: 4px;
  border-radius: 0 999px 999px 0;
  background: linear-gradient(180deg, #9a6bff, #ff7043);
  content: '';
}

.supplement-record-face.is-back {
  transform: rotateY(180deg);
  background:
    radial-gradient(circle at 96% 2%, rgba(255, 112, 67, 0.13), transparent 32%),
    linear-gradient(155deg, #fbf9ff, #f4edff 54%, #fff8ef);
  box-shadow: 0 24px 54px rgba(63, 31, 95, 0.2);
}

.supplement-record-top,
.supplement-editor-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.supplement-record-top > div:first-child > span,
.supplement-editor-header span {
  display: block;
  color: #786c80;
  font-size: 11px;
  font-weight: 850;
}

.supplement-record-top > div:first-child > strong {
  display: block;
  margin-top: 5px;
  color: #24182c;
  font-size: 17px;
  font-weight: 950;
}

.supplement-record-actions {
  flex-shrink: 0;
  display: grid;
  justify-items: end;
  gap: 6px;
}

.open-supplement-button {
  min-width: 68px;
  height: 30px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #7544ce, #ff7043);
  box-shadow: 0 7px 16px rgba(117, 68, 206, 0.24);
  color: #fff;
  font-size: 12px;
  font-weight: 950;
  cursor: pointer;
}

.open-supplement-button:active:not(:disabled) {
  transform: translateY(1px) scale(0.98);
}

.open-supplement-button:disabled {
  opacity: 0.45;
  cursor: default;
}

.supplement-record-actions em {
  box-sizing: border-box;
  min-width: 68px;
  height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  background: rgba(255, 111, 145, 0.14);
  color: #c94668;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-style: normal;
  font-weight: 950;
}

.supplement-record-actions em.is-approved,
.supplement-record-actions em.is-preliminary_approved {
  background: rgba(79, 156, 255, 0.14);
  color: #3375c4;
}

.supplement-record-actions em.is-pending {
  background: rgba(255, 159, 69, 0.16);
  color: #c66a1d;
}

.supplement-record-face.is-front > p {
  margin: 12px 0 0;
  color: #514657;
  font-size: 12px;
  line-height: 1.55;
}

.supplement-record-face .supplement-review-comment {
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(117, 68, 206, 0.08);
}

.supplement-review-comment span {
  margin-right: 6px;
  color: #7544ce;
  font-size: 11px;
  font-weight: 950;
}

.supplement-record-meta {
  margin: 14px 0 0;
  display: grid;
  gap: 8px;
}

.supplement-record-meta div {
  min-width: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.supplement-record-meta dt {
  flex-shrink: 0;
  color: #8d8392;
  font-size: 11px;
  font-weight: 850;
}

.supplement-record-meta dd {
  min-width: 0;
  overflow: hidden;
  margin: 0;
  color: #2c2231;
  font-size: 12px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.view-original-button,
.view-processed-button {
  margin-top: 14px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #7544ce;
  font-size: 11px;
  font-weight: 950;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.supplement-editor-header h3 {
  margin: 5px 0 0;
  color: #24182c;
  font-size: 18px;
  line-height: 1.2;
}

.supplement-editor-header > button {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: rgba(36, 24, 44, 0.08);
  color: #24182c;
  font-size: 20px;
  cursor: pointer;
}

.supplement-context {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(117, 68, 206, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.supplement-context span {
  color: #685b70;
  font-size: 11px;
  font-weight: 850;
}

.supplement-context strong {
  color: #7544ce;
  font-size: 12px;
  font-weight: 950;
}

.supplement-form {
  margin-top: 14px;
  display: grid;
  gap: 12px;
}

.supplement-dropzone {
  position: relative;
  min-height: 150px;
  overflow: hidden;
  border: 1px dashed rgba(117, 68, 206, 0.42);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.66);
  color: #5e4d67;
  cursor: pointer;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 7px;
  text-align: center;
}

.supplement-dropzone input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.supplement-dropzone b {
  color: #7544ce;
  font-size: 28px;
  line-height: 1;
}

.supplement-dropzone strong {
  font-size: 14px;
  font-weight: 950;
}

.supplement-dropzone small {
  padding: 0 14px;
  color: #8a7e90;
  font-size: 10px;
  line-height: 1.45;
}

.supplement-dropzone.has-preview img {
  width: 100%;
  height: 150px;
  object-fit: cover;
}

.supplement-dropzone.has-preview > span {
  position: absolute;
  right: 10px;
  bottom: 10px;
  padding: 6px 9px;
  border-radius: 999px;
  background: rgba(22, 13, 46, 0.78);
  color: #fff;
  font-size: 10px;
  font-weight: 900;
}

.supplement-note {
  display: grid;
  gap: 7px;
}

.supplement-note > span {
  color: #4c4053;
  font-size: 12px;
  font-weight: 950;
}

.supplement-note textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 104px;
  resize: vertical;
  padding: 12px;
  border: 1px solid rgba(117, 68, 206, 0.18);
  border-radius: 18px;
  outline: none;
  background: rgba(255, 255, 255, 0.78);
  color: #2c2231;
  font: inherit;
  font-size: 16px;
  line-height: 1.55;
}

.supplement-note textarea:focus {
  border-color: rgba(117, 68, 206, 0.56);
  box-shadow: 0 0 0 3px rgba(117, 68, 206, 0.1);
}

.supplement-note small {
  color: #8a7e90;
  font-size: 10px;
  line-height: 1.45;
}

.supplement-form-error,
.supplement-form-notice {
  margin: 0;
  padding: 9px 11px;
  border-radius: 14px;
  background: rgba(201, 60, 98, 0.09);
  color: #b73559;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.45;
}

.supplement-form-notice {
  background: rgba(255, 159, 69, 0.12);
  color: #b7631e;
}

.submit-supplement-button {
  min-height: 46px;
  border: 0;
  border-radius: 18px;
  background: linear-gradient(135deg, #7544ce, #ff7043);
  box-shadow: 0 12px 24px rgba(117, 68, 206, 0.22);
  color: #fff;
  font-size: 13px;
  font-weight: 950;
  cursor: pointer;
  transition:
    box-shadow 0.18s ease,
    filter 0.18s ease,
    transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.submit-supplement-button:not(:disabled):active {
  box-shadow:
    0 6px 12px rgba(117, 68, 206, 0.18),
    inset 0 3px 8px rgba(36, 24, 44, 0.2);
  filter: brightness(0.96);
  transform: translateY(2px) scale(0.97);
  transition-duration: 0.08s;
}

.submit-supplement-button.is-confirming {
  background: linear-gradient(135deg, #ffb84d, #ff7a45);
  box-shadow:
    0 12px 24px rgba(255, 122, 69, 0.26),
    0 0 0 4px rgba(255, 184, 77, 0.18);
  animation: submit-supplement-confirm-pulse 1.1s ease-in-out infinite;
}

.submit-supplement-button.is-uploading {
  background: linear-gradient(135deg, #e8f7ff, #bfe8ff);
  color: #17445f;
  box-shadow:
    0 12px 24px rgba(40, 151, 220, 0.18),
    inset 0 -2px 0 rgba(23, 68, 95, 0.08);
  animation: none;
}

.submit-supplement-button.is-succeeded {
  background: linear-gradient(135deg, #2f9b75, #69c97d);
  box-shadow: 0 12px 24px rgba(47, 155, 117, 0.22);
  animation: none;
}

.submit-supplement-button:disabled:not(.is-uploading):not(.is-succeeded) {
  box-shadow: none;
  opacity: 0.42;
  cursor: default;
}

.submit-supplement-button.is-uploading:disabled,
.submit-supplement-button.is-succeeded:disabled {
  opacity: 1;
}

.submit-supplement-label {
  display: inline-block;
  min-width: 104px;
}

.submit-supplement-label-enter-active,
.submit-supplement-label-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.submit-supplement-label-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.96);
}

.submit-supplement-label-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}

@keyframes submit-supplement-confirm-pulse {
  0%,
  100% {
    filter: brightness(1);
  }

  50% {
    filter: brightness(1.08);
  }
}

@media (prefers-reduced-motion: reduce) {
  .supplement-record-shell,
  .supplement-record-flipper,
  .submit-supplement-button,
  .submit-supplement-label-enter-active,
  .submit-supplement-label-leave-active {
    transition: none;
    animation: none;
  }
}
</style>
