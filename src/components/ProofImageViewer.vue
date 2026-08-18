<template>
  <teleport to="body">
    <transition name="proof-image-viewer" appear @after-leave="finishClose">
      <div v-if="isVisible" class="proof-image-viewer" @click.self="closeViewer">
        <section class="proof-image-dialog" role="dialog" aria-modal="true" aria-label="凭证原图">
          <header ref="imageHeader" class="proof-image-header">
            <div>
              <span>运动凭证</span>
              <strong>{{ fileName || '凭证原图' }}</strong>
            </div>
            <button type="button" aria-label="关闭凭证原图" @click="closeViewer">×</button>
          </header>

          <div v-if="isLoading" class="proof-image-state is-loading">
            <i aria-hidden="true"></i>
            <span>正在加载原图…</span>
          </div>

          <div v-else-if="errorMessage" class="proof-image-state is-error">
            <span>{{ errorMessage }}</span>
            <button type="button" @click="loadImage">重新加载</button>
          </div>

          <div
            v-else-if="imageSrc"
            ref="imageContent"
            class="proof-image-content"
            :class="{ 'is-ready': isImageReady }"
            :style="{ height: `${imageContentHeight}px` }"
          >
            <img
              :src="imageSrc"
              :alt="`${fileName || '运动'}凭证原图`"
              @load="handleImageLoad"
              @error="handleImageRenderError"
            >
          </div>
        </section>
      </div>
    </transition>
  </teleport>
</template>

<script>
import { getProofRecordImage } from '../api/history'

export default {
  name: 'ProofImageViewer',
  props: {
    imageUrl: {
      type: String,
      default: ''
    },
    imageBlob: {
      type: null,
      default: null
    },
    fileName: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      imageSrc: '',
      // 首次渲染先保持加载态，不能创建 src 为空的 img，否则会先触发一次假失败。
      isLoading: true,
      errorMessage: '',
      requestVersion: 0,
      originalBodyOverflow: '',
      isVisible: true,
      isClosing: false,
      isImageReady: false,
      imageContentHeight: 220
    }
  },
  methods: {
    async loadImage() {
      const requestVersion = this.requestVersion + 1
      this.requestVersion = requestVersion
      this.isLoading = true
      this.errorMessage = ''
      this.isImageReady = false
      this.imageContentHeight = 220

      this.revokeImageUrl()

      if (this.imageBlob?.size) {
        // 刚上传成功时后端尚未下发 imageUrl，直接复用已提交的本地 WebP，避免无意义的查询失败。
        this.imageSrc = URL.createObjectURL(this.imageBlob)
        this.isLoading = false
        return
      }

      try {
        const imageBlob = await getProofRecordImage(this.imageUrl)

        // 用户关闭弹窗或再次请求后，立即释放迟到响应创建的临时 URL。
        if (requestVersion !== this.requestVersion) {
          return
        }

        this.imageSrc = URL.createObjectURL(imageBlob)
      } catch (error) {
        if (requestVersion !== this.requestVersion) {
          return
        }

        this.errorMessage = this.getErrorMessage(error)
      } finally {
        if (requestVersion === this.requestVersion) {
          this.isLoading = false
        }
      }
    },
    getErrorMessage(error) {
      if (error?.status === 404) {
        return '凭证图片不存在或已失效'
      }

      if (error?.status === 400) {
        return '凭证图片地址无效'
      }

      return '图片暂时无法查看，请稍后重试'
    },
    handleImageRenderError() {
      if (!this.imageSrc) {
        return
      }

      this.revokeImageUrl()
      this.errorMessage = '图片无法解析，请重新加载'
    },
    handleImageLoad(event) {
      const image = event.currentTarget

      if (!image?.naturalWidth || !image?.naturalHeight) {
        return
      }

      // 原图解码完成后再按固有比例计算可视高度，避免 img 从零高度瞬间撑开弹窗。
      this.updateImageContentHeight(image)
      this.isImageReady = true
    },
    updateImageContentHeight(image = this.$refs.imageContent?.querySelector('img')) {
      const content = this.$refs.imageContent

      if (!content || !image?.naturalWidth || !image?.naturalHeight) {
        return
      }

      const contentPadding = 20
      const imageWidth = Math.max(content.clientWidth - contentPadding, 1)
      const naturalHeight = imageWidth * (image.naturalHeight / image.naturalWidth)
      const dialogMaxHeight = Math.min(window.innerHeight * 0.82, 760)
      const headerHeight = this.$refs.imageHeader?.offsetHeight || 0
      const availableHeight = Math.max(dialogMaxHeight - headerHeight, 96)

      // 长图只扩展到弹窗上限，剩余内容继续沿用区域内滚动查看。
      this.imageContentHeight = Math.round(Math.min(naturalHeight + contentPadding, availableHeight))
    },
    handleViewportResize() {
      if (this.isImageReady) {
        this.updateImageContentHeight()
      }
    },
    revokeImageUrl() {
      if (this.imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(this.imageSrc)
      }

      this.imageSrc = ''
    },
    closeViewer() {
      if (this.isClosing) {
        return
      }

      // 与上传面板一致：先播放右侧滑出的反向过渡，再通知父组件销毁并释放 Blob URL。
      this.isClosing = true
      this.isVisible = false
    },
    finishClose() {
      this.$emit('close')
    },
    handleKeydown(event) {
      if (event.key === 'Escape') {
        this.closeViewer()
      }
    },
    lockPageScroll() {
      this.originalBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    },
    unlockPageScroll() {
      document.body.style.overflow = this.originalBodyOverflow
    }
  },
  mounted() {
    this.lockPageScroll()
    window.addEventListener('keydown', this.handleKeydown)
    window.addEventListener('resize', this.handleViewportResize)
    this.loadImage()
  },
  beforeUnmount() {
    // 使已发出的 Blob 响应失效，避免关闭后仍占用对象 URL 与页面滚动状态。
    this.requestVersion += 1
    this.revokeImageUrl()
    this.unlockPageScroll()
    window.removeEventListener('keydown', this.handleKeydown)
    window.removeEventListener('resize', this.handleViewportResize)
  },
  emits: ['close']
}
</script>

<style scoped>
.proof-image-viewer {
  position: fixed;
  z-index: 1200;
  inset: 0;
  padding: max(18px, env(safe-area-inset-top)) 16px max(18px, env(safe-area-inset-bottom));
  background: rgba(16, 24, 19, 0.58);
  display: grid;
  place-items: center;
}

.proof-image-viewer-enter-active,
.proof-image-viewer-leave-active {
  transition: opacity 0.26s ease;
}

.proof-image-viewer-enter-active .proof-image-dialog,
.proof-image-viewer-leave-active .proof-image-dialog {
  transition:
    opacity 0.26s ease,
    transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.proof-image-viewer-enter-from,
.proof-image-viewer-leave-to {
  opacity: 0;
}

.proof-image-viewer-enter-from .proof-image-dialog,
.proof-image-viewer-leave-to .proof-image-dialog {
  opacity: 0;
  transform: translateX(112%);
}

.proof-image-dialog {
  width: min(100%, 520px);
  max-height: min(82vh, 760px);
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.26);
  border-radius: 28px;
  background: #f7faf6;
  box-shadow: 0 28px 66px rgba(12, 20, 14, 0.32);
  display: flex;
  flex-direction: column;
}

.proof-image-header {
  flex-shrink: 0;
  padding: 16px 16px 14px 18px;
  border-bottom: 1px solid rgba(23, 33, 27, 0.08);
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.proof-image-header span,
.proof-image-header strong {
  display: block;
}

.proof-image-header span {
  color: #758078;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.1em;
}

.proof-image-header strong {
  max-width: 260px;
  overflow: hidden;
  margin-top: 4px;
  color: #17211b;
  font-size: 14px;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proof-image-header button {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: rgba(23, 33, 27, 0.07);
  color: #17211b;
  font-size: 24px;
  font-weight: 400;
  line-height: 1;
  cursor: pointer;
}

.proof-image-header button:active {
  transform: scale(0.94);
}

.proof-image-content {
  box-sizing: border-box;
  flex: 0 1 auto;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 10px;
  background: rgba(225, 234, 225, 0.72);
  transition: height 0.42s cubic-bezier(0.22, 1, 0.36, 1);
}

.proof-image-content img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 18px;
  background: #fff;
  opacity: 0;
  transition: opacity 0.22s ease 0.06s;
}

.proof-image-content.is-ready img {
  opacity: 1;
}

.proof-image-state {
  box-sizing: border-box;
  height: 220px;
  min-height: 220px;
  padding: 24px;
  color: #68766d;
  font-size: 13px;
  font-weight: 800;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 12px;
  text-align: center;
}

.proof-image-state.is-loading i {
  width: 26px;
  height: 26px;
  border: 3px solid rgba(47, 143, 50, 0.18);
  border-top-color: #2f8f32;
  border-radius: 50%;
  animation: proof-image-loading 780ms linear infinite;
}

.proof-image-state.is-error {
  color: #7a5a4f;
}

.proof-image-state.is-error button {
  padding: 8px 13px;
  border: 0;
  border-radius: 999px;
  background: rgba(47, 143, 50, 0.13);
  color: #2f8f32;
  font-size: 12px;
  font-weight: 950;
  cursor: pointer;
}

.proof-image-header button:focus-visible,
.proof-image-state.is-error button:focus-visible {
  outline: 3px solid rgba(114, 216, 79, 0.35);
  outline-offset: 2px;
}

@keyframes proof-image-loading {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .proof-image-viewer-enter-active,
  .proof-image-viewer-leave-active,
  .proof-image-viewer-enter-active .proof-image-dialog,
  .proof-image-viewer-leave-active .proof-image-dialog {
    transition: none;
  }

  .proof-image-content,
  .proof-image-content img {
    transition: none;
  }

  .proof-image-state.is-loading i {
    animation: none;
  }
}
</style>
