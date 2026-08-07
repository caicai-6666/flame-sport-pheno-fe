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
    :aria-label="isProofPreviewing ? '查看处理后的图片' : uploadPanelTitle"
    @click.stop
  >
    <div class="upload-panel-flipper" :class="{ 'is-previewing-proof': isProofPreviewing }">
      <section
        class="upload-panel-face is-front"
        :aria-hidden="isProofPreviewing"
        :inert="isProofPreviewing"
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
        <button
          v-if="compressedProofBlob"
          class="proof-preview-trigger"
          type="button"
          :disabled="isProofUploading"
          @click="openProofPreview"
        >
          <strong>{{ selectedProofCount > 1 ? `查看已拼接的 ${selectedProofCount} 张图片` : '查看处理后的图片' }}</strong>
          <em aria-hidden="true">↗</em>
        </button>
        <strong v-else>{{ isProofProcessing ? '正在处理图片' : '未选择图片' }}</strong>
      </div>

      <p class="upload-daily-hint">
        <span aria-hidden="true">i</span>
        同一项目同一运动日期仅以最后一次上传为准
      </p>

      <form
        class="upload-form"
        :class="{ 'has-upload-config-fields': shouldShowUploadConfigFields }"
        @submit.prevent="submitProof"
      >
        <div class="upload-form-body">
        <label
          class="upload-dropzone"
          :class="{
            'has-preview': proofPreviewUrl,
            'has-collage-preview': selectedProofCount > 1,
            'is-processing': isProofProcessing
          }"
        >
          <input
            ref="proofFileInput"
            type="file"
            accept="image/*"
            multiple
            :disabled="isProofProcessing || isProofUploading"
            @change="handleProofUpload"
          >
          <template v-if="proofPreviewUrl">
            <img :src="proofPreviewUrl" :alt="`${task.name}记录预览`">
            <span class="replace-proof">
              {{ selectedProofCount > 1 ? `已拼接 ${selectedProofCount} 张 · 更换` : '更换图片' }}
            </span>
          </template>
          <template v-else>
            <span class="upload-icon">＋</span>
            <strong>点击上传图片</strong>
            <small class="upload-selection-hint">拍照仅支持 1 张 · 选择图片最多 5 张</small>
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

        <div v-if="!isWeightLossChallenge" class="proof-note">
          <span>运动日期</span>
          <div class="proof-date-wheel-shell" :class="{ 'is-disabled': isProofUploading || !hasLegalProofDate }">
            <div class="proof-date-wheel-highlight" aria-hidden="true"></div>
            <span class="proof-date-wheel-marker" aria-hidden="true"></span>
            <div
              ref="proofDateWheel"
              class="proof-date-wheel"
              role="listbox"
              tabindex="0"
              aria-label="选择运动日期"
              @scroll="handleProofDateWheelScroll"
            >
              <div class="proof-date-wheel-spacer"></div>
            <button
              v-for="date in availableProofDates"
              :key="date"
              type="button"
              class="proof-date-option"
              :class="{ 'is-selected': proofDate === date }"
              :data-proof-date="date"
              role="option"
              :aria-selected="proofDate === date"
              :disabled="isProofUploading"
              @click="selectProofDate(date)"
            >
              <strong>{{ formatProofDateDay(date) }}</strong>
              <span>{{ formatProofDateWeekday(date) }}</span>
              </button>
              <div class="proof-date-wheel-spacer"></div>
            </div>
          </div>
        </div>

        <label class="proof-note">
          <span>备注</span>
          <textarea
            v-model.trim="proofNote"
            maxlength="80"
            :placeholder="proofNotePlaceholder"
            required
            @input="resetProofSubmitConfirm"
          ></textarea>
          <small class="proof-note-hint">请填写时长、距离、次数、步数等具体指标；描述越具体、越便于核验，越有助于通过初审。</small>
        </label>
        </div>

        <div class="upload-submit-footer">
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
        </div>
      </form>
      </section>

      <section
        class="upload-panel-face is-back"
        :aria-hidden="!isProofPreviewing"
        :inert="!isProofPreviewing"
      >
        <header class="upload-panel-header">
          <div>
            <span class="upload-kicker">PROOF PREVIEW</span>
            <h2>查看处理后的图片</h2>
          </div>
          <div class="proof-preview-actions">
            <button class="proof-preview-return" type="button" @click="closeProofPreview">
              <span aria-hidden="true">←</span>
              返回编辑
            </button>
            <button class="upload-close" type="button" aria-label="关闭上传弹窗" @click="$emit('close')">×</button>
          </div>
        </header>

        <div class="proof-preview-viewer" aria-label="处理后的凭证图片">
          <img v-if="proofPreviewUrl" :src="proofPreviewUrl" :alt="`${task.name}处理后的完整凭证图片`">
        </div>
        <p class="proof-preview-hint">上下滑动可查看完整长图</p>
      </section>
    </div>
    </aside>
  </div>
</template>

<script>
import { getProjectUploadConfig, uploadProjectProof } from '../api/projects'

const MAX_PROOF_IMAGE_BYTES = 5 * 1024 * 1024
const MAX_PROOF_IMAGE_COUNT = 5
const INITIAL_IMAGE_MAX_EDGE = 1920
const MIN_IMAGE_MAX_EDGE = 320
const JPEG_QUALITY_STEPS = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42]
const LONG_PROOF_JPEG_QUALITY_STEPS = [0.94, 0.9, 0.86, 0.82, 0.78, 0.74]
const MIN_PROOF_UPLOADING_DURATION = 1800
const PROOF_UPLOAD_FAILURE_DURATION = 1400
const LONG_PROOF_MAX_WIDTH = 1440
const LONG_PROOF_MIN_WIDTH = 960
const LONG_PROOF_MAX_HEIGHT = 16000
const LONG_PROOF_PADDING = 16
const LONG_PROOF_GAP = 16
const PROOF_DATE_WHEEL_OPTION_HEIGHT = 34

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

function getLocalDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function normalizeDateString(value) {
  const normalizedValue = String(value || '').slice(0, 10)

  return /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue) ? normalizedValue : ''
}

function getLocalDateFromString(value) {
  const [year, month, day] = String(value).split('-').map(Number)

  return new Date(year, month - 1, day)
}

function getDateRange(startDate, endDate) {
  const dates = []
  const cursor = getLocalDateFromString(startDate)
  const end = getLocalDateFromString(endDate)

  while (cursor <= end) {
    const year = cursor.getFullYear()
    const month = String(cursor.getMonth() + 1).padStart(2, '0')
    const day = String(cursor.getDate()).padStart(2, '0')
    dates.push(`${year}-${month}-${day}`)
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates
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

async function compressDrawableToJpeg(drawable, sourceWidth, sourceHeight) {
  let maxEdge = INITIAL_IMAGE_MAX_EDGE

  while (maxEdge >= MIN_IMAGE_MAX_EDGE) {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    const imageSize = getImageSizeForMaxEdge(sourceWidth, sourceHeight, maxEdge)

    if (!context) {
      throw new Error('当前浏览器无法处理图片，请更换浏览器后重试')
    }

    canvas.width = imageSize.width
    canvas.height = imageSize.height

    // PNG 等透明图片转 JPG 时先铺白底，避免透明区域被浏览器渲染成黑色。
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(drawable, 0, 0, canvas.width, canvas.height)

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

async function compressImageToJpeg(file) {
  const image = await loadImage(file)

  return compressDrawableToJpeg(
    image,
    image.naturalWidth || image.width,
    image.naturalHeight || image.height
  )
}

function createLongProofCanvas(images, canvasWidth) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('当前浏览器无法处理图片，请更换浏览器后重试')
  }

  const contentWidth = canvasWidth - LONG_PROOF_PADDING * 2
  const layout = images.map(image => {
    const imageWidth = image.naturalWidth || image.width
    const imageHeight = image.naturalHeight || image.height
    // 不放大原图，优先保留截图的原始文字像素，避免五图拼接后变糊。
    const scale = Math.min(1, contentWidth / imageWidth)

    return {
      image,
      width: Math.round(imageWidth * scale),
      height: Math.round(imageHeight * scale)
    }
  })
  const contentHeight = layout.reduce((total, item) => total + item.height, 0) + LONG_PROOF_GAP * Math.max(layout.length - 1, 0)
  const canvasHeight = contentHeight + LONG_PROOF_PADDING * 2

  if (canvasHeight > LONG_PROOF_MAX_HEIGHT) {
    return null
  }

  canvas.width = canvasWidth
  canvas.height = canvasHeight
  context.imageSmoothingQuality = 'high'
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)

  let y = LONG_PROOF_PADDING
  for (const item of layout) {
    const x = Math.round((canvas.width - item.width) / 2)
    context.drawImage(item.image, x, y, item.width, item.height)
    y += item.height + LONG_PROOF_GAP
  }

  return canvas
}

async function composeProofImagesToJpeg(files) {
  const images = await Promise.all(files.map(loadImage))
  const widestImage = Math.max(...images.map(image => image.naturalWidth || image.width))
  const initialWidth = Math.min(LONG_PROOF_MAX_WIDTH, widestImage + LONG_PROOF_PADDING * 2)
  const minimumWidth = Math.min(initialWidth, LONG_PROOF_MIN_WIDTH)
  let canvasWidth = initialWidth

  while (canvasWidth >= minimumWidth) {
    const canvas = createLongProofCanvas(images, canvasWidth)

    if (canvas) {
      for (const quality of LONG_PROOF_JPEG_QUALITY_STEPS) {
        const blob = await canvasToJpegBlob(canvas, quality)

        if (blob.size <= MAX_PROOF_IMAGE_BYTES) {
          return blob
        }
      }
    }

    const nextWidth = Math.max(Math.floor(canvasWidth * 0.9), minimumWidth)

    if (nextWidth === canvasWidth) {
      break
    }

    canvasWidth = nextWidth
  }

  throw new Error('多张凭证在保持清晰度后仍超过 5MB，请减少图片数量或选择更清晰的截图')
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
    },
    season: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      proofNote: '',
      proofDate: '',
      proofRecordType: '',
      proofPreviewUrl: '',
      proofFileBaseName: '',
      selectedProofCount: 0,
      compressedProofBlob: null,
      isProofProcessing: false,
      proofProcessError: null,
      isProofUploading: false,
      isProofUploadFailed: false,
      proofUploadFailureTimer: null,
      proofSelectionToken: 0,
      isProofSubmitConfirming: false,
      proofSubmitConfirmTimer: null,
      proofDateWheelTimer: null,
      uploadTouchStartX: 0,
      uploadTouchStartY: 0,
      uploadConfigs: [],
      isUploadConfigLoading: false,
      uploadConfigError: null,
      lockedPageScrollY: 0,
      originalPageScrollStyle: null,
      isProofPreviewing: false
    }
  },
  created() {
    this.setDefaultProofDate()
    this.loadUploadConfig()
  },
  mounted() {
    this.lockPageScroll()
    if (!this.isWeightLossChallenge) {
      this.$nextTick(() => this.scrollProofDateIntoView('auto'))
    }
  },
  computed: {
    proofDateMin() {
      const seasonStartDate = normalizeDateString(this.season?.startDate)
      const seasonEndDate = normalizeDateString(this.season?.endDate)
      const today = getLocalDateString()

      if (!seasonStartDate || !seasonEndDate) {
        return ''
      }

      // 上传仅允许本月记录；赛季边界继续作为额外保护，不能让滚轮越过有效赛季。
      const currentMonthStart = `${today.slice(0, 7)}-01`
      return seasonStartDate > currentMonthStart ? seasonStartDate : currentMonthStart
    },
    proofDateMax() {
      const seasonEndDate = normalizeDateString(this.season?.endDate)
      const today = getLocalDateString()

      if (!seasonEndDate) {
        return ''
      }

      return seasonEndDate < today ? seasonEndDate : today
    },
    hasLegalProofDate() {
      return Boolean(
        this.proofDateMin &&
        this.proofDateMax &&
        this.proofDateMin <= this.proofDateMax
      )
    },
    availableProofDates() {
      if (!this.hasLegalProofDate) {
        return []
      }

      return getDateRange(this.proofDateMin, this.proofDateMax)
    },
    proofDateMonthLabel() {
      const date = this.availableProofDates[0] || getLocalDateString()
      const [year, month] = date.split('-')

      return `${year}年${Number(month)}月`
    },
    isWeightLossChallenge() {
      return this.task?.name === '减重挑战'
    },
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
        return this.selectedProofCount > 1
          ? `正在纵向拼接 ${this.selectedProofCount} 张图片，优先保持文字清晰...`
          : '正在转换为 JPG 并压缩到 5MB 以内...'
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
        this.hasLegalProofDate &&
        this.proofDate >= this.proofDateMin &&
        this.proofDate <= this.proofDateMax &&
        this.proofNote.trim() &&
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
    openProofPreview() {
      if (this.proofPreviewUrl && !this.isProofProcessing && !this.isProofUploading) {
        this.isProofPreviewing = true
      }
    },
    closeProofPreview() {
      this.isProofPreviewing = false
    },
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
    setDefaultProofDate() {
      if (!this.hasLegalProofDate) {
        this.proofDate = ''
        return
      }

      const today = getLocalDateString()
      // 当前激活赛季内默认定位今天；仅在今天不属于可选范围时才退回最近有效日期。
      this.proofDate = this.availableProofDates.includes(today) ? today : this.proofDateMax

      if (!this.isWeightLossChallenge) {
        this.$nextTick(() => this.scrollProofDateIntoView('auto'))
      }
    },
    selectProofDate(date) {
      if (this.isProofUploading || !this.availableProofDates.includes(date)) {
        return
      }

      this.proofDate = date
      this.resetProofSubmitConfirm()
      this.$nextTick(() => this.scrollProofDateIntoView())
    },
    handleProofDateWheelScroll() {
      if (this.isProofUploading) {
        return
      }

      if (this.proofDateWheelTimer) {
        window.clearTimeout(this.proofDateWheelTimer)
      }

      this.proofDateWheelTimer = window.setTimeout(() => {
        this.proofDateWheelTimer = null
        this.syncProofDateWheel()
      }, 90)
    },
    syncProofDateWheel() {
      const wheel = this.$refs.proofDateWheel

      if (!wheel || !this.availableProofDates.length) {
        return
      }

      const selectedIndex = Math.min(
        Math.max(Math.round(wheel.scrollTop / PROOF_DATE_WHEEL_OPTION_HEIGHT), 0),
        this.availableProofDates.length - 1
      )
      const selectedDate = this.availableProofDates[selectedIndex]

      if (this.proofDate !== selectedDate) {
        this.proofDate = selectedDate
        this.resetProofSubmitConfirm()
      }

      this.scrollProofDateToIndex(selectedIndex)
    },
    scrollProofDateIntoView(behavior = 'smooth') {
      const selectedIndex = this.availableProofDates.indexOf(this.proofDate)

      if (selectedIndex >= 0) {
        this.scrollProofDateToIndex(selectedIndex, behavior)
      }
    },
    scrollProofDateToIndex(index, behavior = 'smooth') {
      const wheel = this.$refs.proofDateWheel

      if (!wheel) {
        return
      }

      wheel.scrollTo({
        top: index * PROOF_DATE_WHEEL_OPTION_HEIGHT,
        behavior
      })
    },
    formatProofDateDay(date) {
      return `${Number(date.slice(-2))}日`
    },
    formatProofDateWeekday(date) {
      return `周${['日', '一', '二', '三', '四', '五', '六'][getLocalDateFromString(date).getDay()]}`
    },
    selectUploadConfig(config) {
      this.proofRecordType = config.recordType
      this.clearProofUploadFailure()
      this.resetProofSubmitConfirm()
    },
    async handleProofUpload(event) {
      const files = Array.from(event.target.files || [])

      if (!files.length) {
        return
      }

      if (files.length > MAX_PROOF_IMAGE_COUNT) {
        this.proofProcessError = `一次最多上传 ${MAX_PROOF_IMAGE_COUNT} 张图片，请重新选择`

        if (this.$refs.proofFileInput) {
          this.$refs.proofFileInput.value = ''
        }

        return
      }

      if (files.some(file => file.type && !file.type.startsWith('image/'))) {
        this.proofProcessError = '请选择图片文件'

        if (this.$refs.proofFileInput) {
          this.$refs.proofFileInput.value = ''
        }

        return
      }

      const [firstFile] = files

      this.closeProofPreview()

      if (this.proofPreviewUrl) {
        URL.revokeObjectURL(this.proofPreviewUrl)
      }

      const selectionToken = this.proofSelectionToken + 1
      this.proofSelectionToken = selectionToken
      this.proofPreviewUrl = ''
      this.compressedProofBlob = null
      this.selectedProofCount = files.length
      this.proofFileBaseName = sanitizeProofFileBaseName(
        files.length > 1 ? `${getProofFileBaseName(firstFile.name)}-${files.length}张凭证` : getProofFileBaseName(firstFile.name)
      )
      this.isProofProcessing = true
      this.proofProcessError = null
      this.clearProofUploadFailure()
      this.resetProofSubmitConfirm()

      try {
        const compressedBlob = files.length === 1
          ? await compressImageToJpeg(firstFile)
          : await composeProofImagesToJpeg(files)

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
        this.selectedProofCount = 0
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
          proofDate: this.proofDate,
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
          // 后端上传响应暂不返回 imageUrl；保留本次已提交的 JPG 供当前会话历史即时预览。
          temporaryImageBlob: this.compressedProofBlob,
          proofDate: uploadedRecord?.proofDate || this.proofDate,
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
      this.closeProofPreview()

      if (this.proofPreviewUrl) {
        URL.revokeObjectURL(this.proofPreviewUrl)
      }

      this.proofNote = ''
      this.setDefaultProofDate()
      this.setDefaultProofRecordType()
      this.proofPreviewUrl = ''
      this.proofFileBaseName = ''
      this.selectedProofCount = 0
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

    if (this.proofDateWheelTimer) {
      window.clearTimeout(this.proofDateWheelTimer)
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
  perspective: 1200px;
}

.upload-panel-flipper {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 560ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.upload-panel-flipper.is-previewing-proof {
  transform: rotateY(180deg);
}

.upload-panel-face {
  position: absolute;
  inset: 0;
  padding: 16px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 30px;
  /* 旧版 Android WebView 忽略 color-mix() 时，仍需保留不透明面板。 */
  background: #f7fbf4;
  background:
    radial-gradient(circle at 86% 10%, color-mix(in srgb, var(--accent), transparent 76%), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(247, 251, 244, 0.92));
  box-shadow: 0 26px 60px rgba(23, 33, 27, 0.26);
  color: #17211b;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.upload-panel-face.is-front {
  touch-action: pan-y;
}

.upload-panel-face.is-back {
  transform: rotateY(180deg);
}

.upload-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.upload-kicker {
  color: var(--accent, #2f8f32);
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

.proof-preview-trigger {
  min-width: 0;
  min-height: 34px;
  padding: 6px 8px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
  color: #17211b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  text-align: left;
  transition: transform 160ms cubic-bezier(0.2, 0.8, 0.2, 1), background 160ms ease, box-shadow 160ms ease;
}

.proof-preview-trigger strong {
  min-width: 0;
  font-size: 12px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.proof-preview-trigger em {
  flex-shrink: 0;
  color: var(--accent, #2f8f32);
  font-size: 16px;
  font-style: normal;
  font-weight: 900;
}

.proof-preview-trigger:not(:disabled):hover {
  background: color-mix(in srgb, var(--accent), #fff 90%);
  box-shadow: 0 8px 16px color-mix(in srgb, var(--accent), transparent 84%);
  transform: translateY(-1px);
}

.proof-preview-trigger:not(:disabled):active {
  transform: translateY(1px) scale(0.99);
}

.proof-preview-trigger:focus-visible,
.proof-preview-return:focus-visible {
  border-color: color-mix(in srgb, var(--accent), #fff 18%);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent), transparent 84%);
  outline: none;
}

.proof-preview-trigger:disabled {
  color: rgba(23, 33, 27, 0.45);
  cursor: wait;
}

.proof-preview-actions {
  display: flex;
  align-items: center;
  gap: 7px;
}

.proof-preview-return {
  min-height: 34px;
  padding: 0 9px;
  border: 0;
  border-radius: 12px;
  background: rgba(23, 33, 27, 0.06);
  color: #344238;
  cursor: pointer;
  font-size: 11px;
  font-weight: 900;
}

.proof-preview-return span {
  margin-right: 3px;
  font-size: 15px;
}

.proof-preview-viewer {
  min-height: 0;
  padding: 9px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 22px;
  background: rgba(225, 234, 225, 0.72);
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  flex: 1;
}

.proof-preview-viewer img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 15px;
  background: #fff;
}

.proof-preview-hint {
  flex-shrink: 0;
  margin: 0;
  color: #68766d;
  font-size: 11px;
  font-weight: 800;
  text-align: center;
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
}

.upload-form-body {
  flex: 1;
  min-height: 0;
  padding: 0 2px 2px 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.upload-submit-footer {
  flex: 0 0 auto;
  padding: 12px 0 4px;
}

.upload-dropzone {
  position: relative;
  flex: 1;
  min-height: 128px;
  border: 1.5px dashed var(--accent, #49b84b);
  border: 1.5px dashed color-mix(in srgb, var(--accent), #fff 18%);
  border-radius: 24px;
  background: #f4fbf0;
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
  background: var(--accent, #49b84b);
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

.upload-dropzone .upload-selection-hint {
  color: #4e5b53;
  font-weight: 850;
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

.upload-dropzone.has-collage-preview img {
  /* 拼图预览必须完整展示两张凭证，不能再按封面模式裁切。 */
  background: #f5f7f4;
  object-fit: contain;
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

.upload-form.has-upload-config-fields .upload-form-body {
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

.proof-date-wheel-shell {
  position: relative;
  overflow: hidden;
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 16px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.22)),
    rgba(224, 239, 224, 0.62);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.7),
    0 8px 18px rgba(23, 53, 31, 0.07);
}

.proof-date-wheel-shell::before,
.proof-date-wheel-shell::after {
  position: absolute;
  z-index: 2;
  right: 0;
  left: 0;
  height: 27px;
  pointer-events: none;
  content: '';
}

.proof-date-wheel-shell::before {
  top: 0;
  background: linear-gradient(180deg, rgba(246, 251, 245, 0.96), rgba(246, 251, 245, 0));
}

.proof-date-wheel-shell::after {
  bottom: 0;
  background: linear-gradient(0deg, rgba(246, 251, 245, 0.96), rgba(246, 251, 245, 0));
}

.proof-date-wheel-highlight {
  position: absolute;
  z-index: 1;
  top: 50%;
  right: 7px;
  left: 7px;
  height: 34px;
  border: 1px solid color-mix(in srgb, var(--accent), #fff 72%);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.58);
  box-shadow: 0 5px 14px color-mix(in srgb, var(--accent), transparent 88%);
  transform: translateY(-50%);
}

.proof-date-wheel-marker {
  position: absolute;
  z-index: 4;
  top: 50%;
  left: 10px;
  width: 0;
  height: 0;
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 7px solid var(--accent);
  filter: drop-shadow(0 1px 2px rgba(23, 33, 27, 0.16));
  pointer-events: none;
  transform: translateY(-50%);
}

.proof-date-wheel {
  position: relative;
  z-index: 3;
  height: 88px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
}

.proof-date-wheel::-webkit-scrollbar {
  display: none;
}

.proof-date-wheel:focus-within {
  outline: 3px solid color-mix(in srgb, var(--accent), transparent 78%);
  outline-offset: -3px;
}

.proof-date-wheel-shell.is-disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.proof-date-wheel-spacer {
  height: 27px;
}

.proof-date-option {
  width: 100%;
  height: 34px;
  border: 0;
  background: transparent;
  color: rgba(23, 33, 27, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font: inherit;
  scroll-snap-align: center;
  transform: scale(0.92);
  transition:
    color 0.18s ease,
    transform 0.18s ease;
}

.proof-date-option strong {
  font-size: 14px;
  font-weight: 850;
}

.proof-date-option span {
  font-size: 11px;
  font-weight: 750;
}

.proof-date-option.is-selected {
  color: #17211b;
  transform: scale(1);
}

@supports (backdrop-filter: blur(8px)) {
  .proof-date-wheel-shell {
    backdrop-filter: blur(12px) saturate(1.12);
  }
}

.proof-note textarea:focus {
  border-color: color-mix(in srgb, var(--accent), #fff 18%);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent), transparent 82%);
}

.proof-note-hint {
  color: #78847d;
  font-size: 11px;
  font-weight: 750;
  line-height: 1.55;
}

.upload-form.has-upload-config-fields .proof-note textarea {
  height: clamp(52px, 9vh, 66px);
}

.submit-proof {
  width: 100%;
  display: block;
  position: relative;
  overflow: hidden;
  min-height: 46px;
  border: 0;
  border-radius: 18px;
  background: linear-gradient(135deg, var(--accent, #49b84b), #2f8f32);
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

  .upload-panel-face {
    gap: 9px;
    padding: 14px;
  }

  .upload-submit-footer {
    padding-top: 9px;
    padding-bottom: 3px;
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

@media (prefers-reduced-motion: reduce) {
  .upload-panel-flipper,
  .proof-preview-trigger {
    transition: none;
  }
}
</style>
