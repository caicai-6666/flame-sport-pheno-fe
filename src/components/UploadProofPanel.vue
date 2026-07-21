<template>
  <div
    class="upload-overlay"
    role="presentation"
    :style="{ '--accent': task.accent }"
    @click="$emit('close')"
  >
    <aside
      class="upload-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-panel-title"
      @click.stop
      @touchstart.passive="startUploadSwipe"
      @touchend.passive="finishUploadSwipe"
    >
      <header class="upload-panel-header">
        <div>
          <span class="upload-kicker">UPLOAD PROOF</span>
          <h2 id="upload-panel-title">{{ uploadPanelTitle }}</h2>
        </div>
        <button class="upload-close" type="button" aria-label="关闭上传弹窗" @click="$emit('close')">×</button>
      </header>

      <div class="upload-summary">
        <span>{{ uploadSummaryLabel }}</span>
        <label v-if="compressedProofBlob" class="proof-name-editor">
          <input
            v-model="proofFileBaseName"
            type="text"
            maxlength="60"
            aria-label="重命名上传图片"
            :disabled="isProofUploading"
            @blur="sanitizeProofFileName"
            @input="resetProofSubmitConfirm"
          >
          <em>.jpg</em>
        </label>
        <strong v-else>{{ isProofProcessing ? '正在处理图片' : '未选择图片' }}</strong>
      </div>

      <p class="upload-daily-hint">
        <span aria-hidden="true">i</span>
        当日内多次上传仅以最后一次为准
      </p>

      <form
        class="upload-form"
        :class="{ 'has-upload-config-fields': shouldShowUploadConfigFields }"
        @submit.prevent="submitProof"
      >
        <label
          class="upload-dropzone"
          :class="{
            'has-preview': proofPreviewUrl,
            'is-processing': isProofProcessing
          }"
        >
          <input
            ref="proofFileInput"
            type="file"
            accept="image/*"
            :disabled="isProofProcessing || isProofUploading"
            @change="handleProofUpload"
          >
          <template v-if="proofPreviewUrl">
            <img :src="proofPreviewUrl" :alt="`${task.name}记录预览`">
            <span class="replace-proof">更换图片</span>
          </template>
          <template v-else>
            <span class="upload-icon">＋</span>
            <strong>点击上传图片</strong>
            <small>{{ uploadHelpText }}</small>
          </template>
        </label>

        <p v-if="uploadConfigError" class="upload-config-error">
          上传要求加载失败，请稍后重试
        </p>
        <p v-if="proofProcessError" class="upload-config-error">
          {{ proofProcessError }}
        </p>
        <div v-if="shouldShowUploadConfigFields" class="upload-config-fields">
          <div v-if="shouldShowRecordTypeTabs" class="record-type-toggle" role="group" aria-label="选择上传记录类型">
            <button
              v-for="config in uploadConfigs"
              :key="config.recordType"
              type="button"
              :class="{ 'is-active': proofRecordType === config.recordType }"
              @click="selectUploadConfig(config)"
            >
              <strong>{{ config.recordType }}</strong>
            </button>
          </div>

        </div>

        <label class="proof-note">
          <span>备注</span>
          <textarea
            v-model.trim="proofNote"
            maxlength="80"
            :placeholder="proofNotePlaceholder"
          ></textarea>
        </label>

        <button
          class="submit-proof"
          type="submit"
          :class="{
            'is-confirming': isProofSubmitConfirming,
            'is-uploading': isProofUploading,
            'is-failed': isProofUploadFailed
          }"
          :disabled="!canSubmitProof"
        >
          <Transition name="submit-proof-label" mode="out-in">
            <span
              :key="submitProofButtonText"
              class="submit-proof-label"
            >
              {{ submitProofButtonText }}
            </span>
          </Transition>
        </button>
      </form>
    </aside>
  </div>
</template>

<script>
import { getProjectUploadConfig, uploadProjectProof } from '../api/projects'

const MAX_PROOF_IMAGE_BYTES = 1024 * 1024
const INITIAL_IMAGE_MAX_EDGE = 1920
const MIN_IMAGE_MAX_EDGE = 320
const JPEG_QUALITY_STEPS = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42]
const MIN_PROOF_UPLOADING_DURATION = 1800
const PROOF_UPLOAD_FAILURE_DURATION = 1400

const defaultUploadConfig = {
  uploadConfigId: '',
  recordType: '日常记录',
  uploadHint: '运动记录、截图或现场照片',
  noteExample: '补充说明本次记录的运动内容'
}

function getProofFileBaseName(fileName) {
  const safeFileName = String(fileName || '').split(/[/\\]/).pop() || ''
  const baseName = safeFileName.replace(/\.[^.]*$/, '').trim()

  return baseName || 'proof'
}

function sanitizeProofFileBaseName(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|#%{}^~[\]`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
}

function toProofJpgFileName(baseName) {
  return `${sanitizeProofFileBaseName(baseName) || 'proof'}.jpg`
}

function getImageSizeForMaxEdge(width, height, maxEdge) {
  const longestEdge = Math.max(width, height)

  if (longestEdge <= maxEdge) {
    return {
      width,
      height
    }
  }

  const ratio = maxEdge / longestEdge

  return {
    width: Math.max(Math.round(width * ratio), 1),
    height: Math.max(Math.round(height * ratio), 1)
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('图片读取失败，请重新选择图片'))
    }
    image.src = objectUrl
  })
}

function canvasToJpegBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('图片转换失败，请重新选择图片'))
        return
      }

      resolve(blob)
    }, 'image/jpeg', quality)
  })
}

async function compressImageToJpeg(file) {
  const image = await loadImage(file)
  let maxEdge = INITIAL_IMAGE_MAX_EDGE

  while (maxEdge >= MIN_IMAGE_MAX_EDGE) {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    const imageSize = getImageSizeForMaxEdge(image.naturalWidth || image.width, image.naturalHeight || image.height, maxEdge)

    if (!context) {
      throw new Error('当前浏览器无法处理图片，请更换浏览器后重试')
    }

    canvas.width = imageSize.width
    canvas.height = imageSize.height

    // PNG 等透明图片转 JPG 时先铺白底，避免透明区域被浏览器渲染成黑色。
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    for (const quality of JPEG_QUALITY_STEPS) {
      const blob = await canvasToJpegBlob(canvas, quality)

      if (blob.size <= MAX_PROOF_IMAGE_BYTES) {
        return blob
      }
    }

    maxEdge = Math.floor(maxEdge * 0.82)
  }

  throw new Error('图片压缩后仍超过 1MB，请更换图片')
}

function wait(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}

async function waitForMinProofUploadingDuration(startedAt) {
  const elapsed = Date.now() - startedAt
  const remaining = MIN_PROOF_UPLOADING_DURATION - elapsed

  if (remaining > 0) {
    await wait(remaining)
  }
}

export default {
  name: 'UploadProofPanel',
  props: {
    task: {
      type: Object,
      required: true
    },
    seasonId: {
      type: [String, Number],
      default: ''
    }
  },
  data() {
    return {
      proofNote: '',
      proofRecordType: '',
      proofPreviewUrl: '',
      proofFileBaseName: '',
      compressedProofBlob: null,
      isProofProcessing: false,
      proofProcessError: null,
      isProofUploading: false,
      isProofUploadFailed: false,
      proofUploadFailureTimer: null,
      proofSelectionToken: 0,
      isProofSubmitConfirming: false,
      proofSubmitConfirmTimer: null,
      uploadTouchStartX: 0,
      uploadTouchStartY: 0,
      uploadConfigs: [],
      isUploadConfigLoading: false,
      uploadConfigError: null,
      lockedPageScrollY: 0,
      originalPageScrollStyle: null
    }
  },
  created() {
    this.loadUploadConfig()
  },
  mounted() {
    this.lockPageScroll()
  },
  computed: {
    selectedUploadConfig() {
      return this.uploadConfigs.find(config => config.recordType === this.proofRecordType) || this.uploadConfigs[0] || defaultUploadConfig
    },
    shouldShowRecordTypeTabs() {
      return this.uploadConfigs.length > 1
    },
    shouldShowUploadConfigFields() {
      return this.shouldShowRecordTypeTabs
    },
    uploadPanelTitle() {
      return `上传${this.task.name}记录`
    },
    uploadSummaryLabel() {
      return this.selectedUploadConfig.recordType
    },
    uploadHelpText() {
      if (this.isProofProcessing) {
        return '正在转换为 JPG 并压缩到 1MB 以内...'
      }

      return this.isUploadConfigLoading ? '正在加载上传要求...' : this.selectedUploadConfig.uploadHint
    },
    proofNotePlaceholder() {
      const noteExample = this.selectedUploadConfig.noteExample || ''

      if (!noteExample || noteExample.startsWith('例如：')) {
        return noteExample
      }

      return `例如：${noteExample}`
    },
    canSubmitProof() {
      return Boolean(
        !this.isUploadConfigLoading &&
        !this.isProofProcessing &&
        !this.isProofUploading &&
        !this.isProofUploadFailed &&
        this.selectedUploadConfig.uploadConfigId &&
        this.compressedProofBlob &&
        sanitizeProofFileBaseName(this.proofFileBaseName)
      )
    },
    finalProofFileName() {
      return toProofJpgFileName(this.proofFileBaseName)
    },
    submitProofButtonText() {
      if (this.isProofProcessing) {
        return '处理图片中'
      }

      if (this.isProofUploading) {
        return '上传中'
      }

      if (this.isProofUploadFailed) {
        return '上传失败'
      }

      return this.isProofSubmitConfirming ? '确认提交' : '提交记录'
    }
  },
  methods: {
    async loadUploadConfig() {
      if (!this.task?.projectId) {
        this.uploadConfigs = [defaultUploadConfig]
        this.setDefaultProofRecordType()
        return
      }

      this.isUploadConfigLoading = true

      try {
        const uploadConfigs = await getProjectUploadConfig(this.task.projectId)

        if (!uploadConfigs.length || uploadConfigs.some(config => !config.uploadConfigId)) {
          this.uploadConfigs = [defaultUploadConfig]
          this.uploadConfigError = new Error('缺少项目上传配置 ID')
          this.setDefaultProofRecordType()
          return
        }

        this.uploadConfigs = uploadConfigs
        this.uploadConfigError = null
        this.setDefaultProofRecordType()
      } catch (error) {
        this.uploadConfigs = [defaultUploadConfig]
        this.uploadConfigError = error
        this.setDefaultProofRecordType()
      } finally {
        this.isUploadConfigLoading = false
      }
    },
    setDefaultProofRecordType() {
      this.proofRecordType = this.uploadConfigs[0]?.recordType || defaultUploadConfig.recordType
    },
    selectUploadConfig(config) {
      this.proofRecordType = config.recordType
      this.clearProofUploadFailure()
      this.resetProofSubmitConfirm()
    },
    async handleProofUpload(event) {
      const [file] = event.target.files || []

      if (!file) {
        return
      }

      if (this.proofPreviewUrl) {
        URL.revokeObjectURL(this.proofPreviewUrl)
      }

      const selectionToken = this.proofSelectionToken + 1
      this.proofSelectionToken = selectionToken
      this.proofPreviewUrl = ''
      this.compressedProofBlob = null
      this.proofFileBaseName = sanitizeProofFileBaseName(getProofFileBaseName(file.name))
      this.isProofProcessing = true
      this.proofProcessError = null
      this.clearProofUploadFailure()
      this.resetProofSubmitConfirm()

      try {
        const compressedBlob = await compressImageToJpeg(file)

        if (selectionToken !== this.proofSelectionToken) {
          return
        }

        this.compressedProofBlob = compressedBlob
        this.proofPreviewUrl = URL.createObjectURL(compressedBlob)
      } catch (error) {
        if (selectionToken !== this.proofSelectionToken) {
          return
        }

        this.proofProcessError = error.message || '图片处理失败，请重新选择图片'
        this.proofFileBaseName = ''
        this.compressedProofBlob = null

        if (this.$refs.proofFileInput) {
          this.$refs.proofFileInput.value = ''
        }
      } finally {
        if (selectionToken === this.proofSelectionToken) {
          this.isProofProcessing = false
        }
      }
    },
    async submitProof() {
      if (!this.canSubmitProof) {
        return
      }

      if (!this.isProofSubmitConfirming) {
        this.startProofSubmitConfirm()
        return
      }

      if (!this.seasonId || !this.task?.projectId || !this.selectedUploadConfig.uploadConfigId) {
        this.showProofUploadFailure()
        this.resetProofSubmitConfirm()
        return
      }

      this.isProofUploading = true
      this.clearProofUploadFailure()
      this.sanitizeProofFileName()
      this.resetProofSubmitConfirm()
      const uploadStartedAt = Date.now()

      try {
        const proofFile = new File([this.compressedProofBlob], this.finalProofFileName, {
          type: 'image/jpeg',
          lastModified: Date.now()
        })
        const uploadedRecord = await uploadProjectProof({
          seasonId: this.seasonId,
          projectId: this.task.projectId,
          projectUploadConfigId: this.selectedUploadConfig.uploadConfigId,
          note: this.proofNote,
          imageFile: proofFile
        })

        await waitForMinProofUploadingDuration(uploadStartedAt)
        this.$emit('submit-proof', {
          id: `proof-${Date.now()}`,
          taskName: this.task.name,
          projectId: this.task.projectId,
          fileName: proofFile.name,
          recordType: this.selectedUploadConfig.recordType,
          note: this.proofNote,
          reviewStatus: 'pending',
          uploadedAt: uploadedRecord?.createdAt || new Date().toISOString()
        })
        this.resetProofForm()
        this.$emit('close')
      } catch {
        await waitForMinProofUploadingDuration(uploadStartedAt)
        this.showProofUploadFailure()
      } finally {
        this.isProofUploading = false
      }
    },
    sanitizeProofFileName() {
      this.proofFileBaseName = sanitizeProofFileBaseName(this.proofFileBaseName)
    },
    showProofUploadFailure() {
      this.isProofSubmitConfirming = false
      this.isProofUploadFailed = true

      if (this.proofSubmitConfirmTimer) {
        window.clearTimeout(this.proofSubmitConfirmTimer)
        this.proofSubmitConfirmTimer = null
      }

      if (this.proofUploadFailureTimer) {
        window.clearTimeout(this.proofUploadFailureTimer)
      }

      this.proofUploadFailureTimer = window.setTimeout(() => {
        this.isProofUploadFailed = false
        this.proofUploadFailureTimer = null
      }, PROOF_UPLOAD_FAILURE_DURATION)
    },
    clearProofUploadFailure() {
      this.isProofUploadFailed = false

      if (this.proofUploadFailureTimer) {
        window.clearTimeout(this.proofUploadFailureTimer)
        this.proofUploadFailureTimer = null
      }
    },
    startProofSubmitConfirm() {
      this.clearProofUploadFailure()
      this.isProofSubmitConfirming = true

      if (this.proofSubmitConfirmTimer) {
        window.clearTimeout(this.proofSubmitConfirmTimer)
      }

      this.proofSubmitConfirmTimer = window.setTimeout(() => {
        this.isProofSubmitConfirming = false
        this.proofSubmitConfirmTimer = null
      }, 1800)
    },
    resetProofSubmitConfirm() {
      this.isProofSubmitConfirming = false

      if (this.proofSubmitConfirmTimer) {
        window.clearTimeout(this.proofSubmitConfirmTimer)
        this.proofSubmitConfirmTimer = null
      }
    },
    resetProofForm() {
      this.proofSelectionToken += 1

      if (this.proofPreviewUrl) {
        URL.revokeObjectURL(this.proofPreviewUrl)
      }

      this.proofNote = ''
      this.setDefaultProofRecordType()
      this.proofPreviewUrl = ''
      this.proofFileBaseName = ''
      this.compressedProofBlob = null
      this.isProofProcessing = false
      this.proofProcessError = null
      this.isProofUploading = false
      this.clearProofUploadFailure()
      this.resetProofSubmitConfirm()

      if (this.$refs.proofFileInput) {
        this.$refs.proofFileInput.value = ''
      }
    },
    startUploadSwipe(event) {
      const [touch] = event.changedTouches

      if (!touch) {
        return
      }

      this.uploadTouchStartX = touch.clientX
      this.uploadTouchStartY = touch.clientY
    },
    finishUploadSwipe(event) {
      const [touch] = event.changedTouches

      if (!touch) {
        return
      }

      const deltaX = touch.clientX - this.uploadTouchStartX
      const deltaY = touch.clientY - this.uploadTouchStartY

      if (deltaX < -48 && Math.abs(deltaY) < 64) {
        this.$emit('close')
      }
    },
    lockPageScroll() {
      if (typeof window === 'undefined' || typeof document === 'undefined' || this.originalPageScrollStyle) {
        return
      }

      const { body, documentElement } = document
      this.lockedPageScrollY = window.scrollY || window.pageYOffset || 0
      this.originalPageScrollStyle = {
        bodyPosition: body.style.position,
        bodyTop: body.style.top,
        bodyLeft: body.style.left,
        bodyRight: body.style.right,
        bodyWidth: body.style.width,
        bodyOverflow: body.style.overflow,
        bodyTouchAction: body.style.touchAction,
        htmlOverflow: documentElement.style.overflow
      }

      body.style.position = 'fixed'
      body.style.top = `-${this.lockedPageScrollY}px`
      body.style.left = '0'
      body.style.right = '0'
      body.style.width = '100%'
      body.style.overflow = 'hidden'
      body.style.touchAction = 'none'
      documentElement.style.overflow = 'hidden'
    },
    unlockPageScroll() {
      if (typeof window === 'undefined' || typeof document === 'undefined' || !this.originalPageScrollStyle) {
        return
      }

      const { body, documentElement } = document
      body.style.position = this.originalPageScrollStyle.bodyPosition
      body.style.top = this.originalPageScrollStyle.bodyTop
      body.style.left = this.originalPageScrollStyle.bodyLeft
      body.style.right = this.originalPageScrollStyle.bodyRight
      body.style.width = this.originalPageScrollStyle.bodyWidth
      body.style.overflow = this.originalPageScrollStyle.bodyOverflow
      body.style.touchAction = this.originalPageScrollStyle.bodyTouchAction
      documentElement.style.overflow = this.originalPageScrollStyle.htmlOverflow
      window.scrollTo(0, this.lockedPageScrollY)
      this.originalPageScrollStyle = null
    }
  },
  beforeUnmount() {
    this.unlockPageScroll()
    this.proofSelectionToken += 1

    if (this.proofPreviewUrl) {
      URL.revokeObjectURL(this.proofPreviewUrl)
    }

    if (this.proofSubmitConfirmTimer) {
      window.clearTimeout(this.proofSubmitConfirmTimer)
    }

    if (this.proofUploadFailureTimer) {
      window.clearTimeout(this.proofUploadFailureTimer)
    }
  },
  emits: ['close', 'submit-proof']
}
</script>

<style scoped>
.upload-overlay {
  --upload-safe-top: 92px;
  --upload-header-height: 76px;
  --upload-panel-edge-gap: 16px;
  --upload-bottom-nav-space: 88px;
  --upload-panel-header-gap: calc(var(--upload-safe-top) - var(--upload-header-height) + var(--upload-panel-edge-gap));

  position: fixed;
  z-index: 20;
  top: 0;
  bottom: 0;
  left: 50%;
  width: min(100vw, 430px);
  transform: translateX(-50%);
  background: rgba(18, 27, 21, 0.22);
  backdrop-filter: blur(4px);
}

.upload-panel {
  position: absolute;
  top: calc(var(--upload-safe-top) + var(--upload-panel-edge-gap));
  right: 16px;
  bottom: calc(var(--upload-bottom-nav-space) + var(--upload-panel-header-gap));
  width: min(330px, calc(100% - 58px));
  padding: 16px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 30px;
  background:
    radial-gradient(circle at 86% 10%, color-mix(in srgb, var(--accent), transparent 76%), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 251, 244, 0.92));
  box-shadow: 0 26px 60px rgba(23, 33, 27, 0.26);
  color: #17211b;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  touch-action: pan-y;
}

.upload-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.upload-kicker {
  color: color-mix(in srgb, var(--accent), #17211b 22%);
  font-size: 10px;
  font-weight: 950;
  letter-spacing: 0.16em;
}

.upload-panel-header h2 {
  margin: 5px 0 0;
  font-size: 20px;
  line-height: 1.12;
  letter-spacing: -0.04em;
}

.upload-close {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 14px;
  background: rgba(23, 33, 27, 0.06);
  color: #17211b;
  cursor: pointer;
  font-size: 23px;
  line-height: 1;
}

.upload-summary {
  padding: 10px 12px;
  border-radius: 18px;
  background: rgba(23, 33, 27, 0.04);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.upload-summary span {
  color: #758078;
  font-weight: 800;
}

.upload-summary strong {
  overflow: hidden;
  color: #17211b;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proof-name-editor {
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 4px;
}

.proof-name-editor input {
  min-width: 0;
  border: 0;
  background: transparent;
  color: #17211b;
  font: inherit;
  font-size: 12px;
  font-weight: 900;
  outline: none;
}

.proof-name-editor em {
  color: #758078;
  font-size: 12px;
  font-style: normal;
  font-weight: 900;
}

.proof-name-editor:focus-within {
  border-color: color-mix(in srgb, var(--accent), #fff 18%);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent), transparent 84%);
}

.upload-daily-hint {
  margin: -3px 0 0;
  padding: 8px 10px;
  border: 1px solid color-mix(in srgb, var(--accent), transparent 82%);
  border-radius: 16px;
  background: color-mix(in srgb, var(--accent), #fff 90%);
  color: #536058;
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.35;
}

.upload-daily-hint span {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent), #17211b 18%);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 950;
  font-style: normal;
  line-height: 1;
}

.upload-form {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.upload-dropzone {
  position: relative;
  flex: 1;
  min-height: 128px;
  border: 1.5px dashed color-mix(in srgb, var(--accent), #fff 18%);
  border-radius: 24px;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--accent), #fff 90%), rgba(255, 255, 255, 0.74)),
    #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  overflow: hidden;
  text-align: center;
}

.upload-dropzone input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.upload-dropzone input:disabled {
  cursor: wait;
}

.upload-icon {
  width: 48px;
  height: 48px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--accent), #fff 20%);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 30px;
  line-height: 1;
  box-shadow: 0 12px 24px color-mix(in srgb, var(--accent), transparent 72%);
}

.upload-dropzone strong {
  font-size: 15px;
  font-weight: 950;
}

.upload-dropzone small {
  max-width: 180px;
  color: #758078;
  font-size: 11px;
  font-weight: 750;
  line-height: 1.45;
}

.upload-dropzone.has-preview {
  border-style: solid;
  background: #17211b;
}

.upload-dropzone.is-processing {
  cursor: wait;
  opacity: 0.82;
}

.upload-dropzone img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.replace-proof {
  position: absolute;
  right: 10px;
  bottom: 10px;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: #17211b;
  font-size: 11px;
  font-weight: 900;
}

.upload-form.has-upload-config-fields {
  gap: 10px;
}

.upload-form.has-upload-config-fields .upload-dropzone {
  min-height: 102px;
}

.upload-config-fields {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.record-type-toggle {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.record-type-toggle button {
  min-height: 54px;
  padding: 8px 10px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  color: #17211b;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 3px;
  text-align: left;
}

.record-type-toggle button.is-active {
  border-color: color-mix(in srgb, var(--accent), #fff 18%);
  background: color-mix(in srgb, var(--accent), #fff 82%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent), transparent 72%);
}

.record-type-toggle strong {
  font-size: 12px;
  font-weight: 950;
}

.upload-config-error {
  margin: -2px 0 0;
  color: #d14d4d;
  font-size: 11px;
  font-weight: 850;
  line-height: 1.45;
}

.proof-note {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.proof-note span {
  color: #4e5b53;
  font-size: 12px;
  font-weight: 900;
}

.proof-note textarea {
  width: 100%;
  height: clamp(64px, 12vh, 86px);
  padding: 11px 12px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.78);
  color: #17211b;
  font: inherit;
  font-size: 13px;
  line-height: 1.45;
  outline: none;
  resize: none;
}

.proof-note textarea:focus {
  border-color: color-mix(in srgb, var(--accent), #fff 18%);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent), transparent 82%);
}

.upload-form.has-upload-config-fields .proof-note textarea {
  height: clamp(52px, 9vh, 66px);
}

.submit-proof {
  position: relative;
  overflow: hidden;
  min-height: 46px;
  border: 0;
  border-radius: 18px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--accent), #fff 8%), #2f8f32);
  color: #fff;
  box-shadow: 0 14px 26px color-mix(in srgb, var(--accent), transparent 68%);
  cursor: pointer;
  font-size: 14px;
  font-weight: 950;
  transform: translateY(0) scale(1);
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    color 0.2s ease,
    filter 0.2s ease,
    transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.submit-proof::after {
  position: absolute;
  inset: 0;
  width: 58%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.74), transparent);
  content: '';
  opacity: 0;
  pointer-events: none;
  transform: translateX(-130%) skewX(-18deg);
}

.submit-proof:not(:disabled):hover {
  filter: brightness(1.03);
  transform: translateY(-2px) scale(1.01);
}

.submit-proof:not(:disabled):active {
  box-shadow:
    0 6px 12px color-mix(in srgb, var(--accent), transparent 76%),
    inset 0 3px 8px rgba(23, 33, 27, 0.2);
  filter: brightness(0.96);
  transform: translateY(2px) scale(0.96);
  transition-duration: 0.08s;
}

.submit-proof.is-confirming {
  background: linear-gradient(135deg, #ffb84d, #ff7a45);
  box-shadow:
    0 12px 24px rgba(255, 122, 69, 0.26),
    0 0 0 4px rgba(255, 184, 77, 0.18);
  animation: submit-proof-confirm-pulse 1.1s ease-in-out infinite;
}

.submit-proof.is-uploading {
  background: linear-gradient(135deg, #e8f7ff, #bfe8ff);
  color: #17445f;
  box-shadow:
    0 12px 24px rgba(40, 151, 220, 0.18),
    inset 0 -2px 0 rgba(23, 68, 95, 0.08);
  animation: none;
}

.submit-proof.is-uploading::after {
  animation: submit-proof-shine 780ms ease-out infinite;
}

.submit-proof.is-failed {
  background: linear-gradient(135deg, #ff8f8f, #ff5c5c);
  color: #fff;
  box-shadow:
    0 12px 24px rgba(255, 92, 92, 0.24),
    0 0 0 4px rgba(255, 92, 92, 0.14);
  animation: none;
}

@keyframes submit-proof-confirm-pulse {
  0%,
  100% {
    filter: brightness(1);
  }

  50% {
    filter: brightness(1.08);
  }
}

.submit-proof-label {
  position: relative;
  z-index: 1;
}

@keyframes submit-proof-shine {
  0% {
    opacity: 0;
    transform: translateX(-130%) skewX(-18deg);
  }

  18% {
    opacity: 0.9;
  }

  100% {
    opacity: 0;
    transform: translateX(230%) skewX(-18deg);
  }
}

.submit-proof-label {
  display: inline-block;
  min-width: 58px;
}

.submit-proof-label-enter-active,
.submit-proof-label-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.submit-proof-label-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.96);
}

.submit-proof-label-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}

.submit-proof:disabled {
  background: rgba(23, 33, 27, 0.12);
  box-shadow: none;
  color: rgba(23, 33, 27, 0.38);
  cursor: not-allowed;
  transform: none;
}

.submit-proof.is-uploading:disabled {
  background: linear-gradient(135deg, #e8f7ff, #bfe8ff);
  box-shadow:
    0 12px 24px rgba(40, 151, 220, 0.18),
    inset 0 -2px 0 rgba(23, 68, 95, 0.08);
  color: #17445f;
  cursor: wait;
}

.submit-proof.is-failed:disabled {
  background: linear-gradient(135deg, #ff8f8f, #ff5c5c);
  color: #fff;
  box-shadow:
    0 12px 24px rgba(255, 92, 92, 0.24),
    0 0 0 4px rgba(255, 92, 92, 0.14);
  opacity: 1;
}

.upload-panel-enter-active,
.upload-panel-leave-active {
  transition: opacity 0.26s ease;
}

.upload-panel-enter-active .upload-panel,
.upload-panel-leave-active .upload-panel {
  transition:
    opacity 0.26s ease,
    transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.upload-panel-enter-from,
.upload-panel-leave-to {
  opacity: 0;
}

.upload-panel-enter-from .upload-panel,
.upload-panel-leave-to .upload-panel {
  opacity: 0;
  transform: translateX(112%);
}

@media (max-height: 640px) {
  .upload-overlay {
    --upload-safe-top: 84px;
    --upload-panel-edge-gap: 10px;
  }

  .upload-panel {
    gap: 9px;
    padding: 14px;
  }

  .upload-summary {
    padding: 8px 10px;
  }

  .upload-dropzone {
    min-height: 104px;
  }

  .upload-form.has-upload-config-fields .upload-dropzone {
    min-height: 82px;
  }

  .record-type-toggle button {
    min-height: 48px;
  }

  .proof-note textarea {
    height: 58px;
  }

  .upload-form.has-upload-config-fields .proof-note textarea {
    height: 46px;
  }

  .submit-proof {
    min-height: 42px;
  }
}
</style>
