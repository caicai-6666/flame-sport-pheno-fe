<template>
  <ShopPage
    :products="products"
    :is-product-loading="isProductLoading"
    :product-error-message="productErrorMessage"
    :point-records="pointRecords"
    :initial-available-points="availablePoints"
    :is-point-flow-loading="isPointFlowLoading"
    :point-flow-error-message="pointFlowErrorMessage"
    :is-redeem-available="redeemAvailability.isAvailable"
    :redeem-window-message="redeemAvailability.message"
    :is-no-active-season="isNoActiveSeason"
    :consume-product="consumeProduct"
    @retry-products="loadProducts"
    @retry-point-flow="loadPointFlow"
    @consume-success="handleConsumeSuccess"
    @product-image-loaded="markProductImageLoaded"
    @product-image-failed="markProductImageFailed"
    @product-panel-visibility-change="handleProductPanelVisibilityChange"
  />
</template>

<script>
import ShopPage from '../components/ShopPage.vue'
import {
  consumeShopProduct,
  getLatestPointBalance,
  getShopPointFlow,
  getShopProducts,
  getShopProductImageSrc,
  isProductImageRequestPausedError
} from '../api/shop'
import { getCurrentSeason, isNoActiveSeasonError } from '../api/season'
import { appState, setCurrentSeason, setSeasonAvailability } from '../state/appState'
import { groupProductsByTier } from '../utils/shopProductTiers'
import { getShopRedeemAvailability } from '../utils/shopRedeemWindow'
import { getSeasonWriteAvailability, getSeasonWriteUpdateDelay } from '../utils/seasonWriteAvailability'

export default {
  name: 'ShopView',
  components: {
    ShopPage
  },
  data() {
    return {
      products: [],
      pointRecords: [],
      availablePoints: 0,
      isProductLoading: false,
      productErrorMessage: '',
      isPointFlowLoading: false,
      pointFlowErrorMessage: '',
      productImageLoadVersion: 0,
      isProductImageQueueRunning: false,
      isShopRouteActive: false,
      isProductPanelVisible: true,
      currentSeason: null,
      redeemAvailability: {
        isAvailable: false,
        message: '正在确认兑换时间',
        nextChangeAt: null
      },
      redeemWindowTimer: null
    }
  },
  created() {
    this.loadProducts()
    this.loadPointFlow()
    this.loadRedeemWindow()
  },
  activated() {
    this.isShopRouteActive = this.$route.name === 'shop'
    this.startProductImageQueue()
  },
  deactivated() {
    this.isShopRouteActive = false
  },
  beforeUnmount() {
    this.productImageLoadVersion += 1
    this.revokeProductImageUrls()
    this.clearRedeemWindowTimer()
  },
  computed: {
    isNoActiveSeason() {
      return appState.seasonAvailability === 'unavailable'
    },
    canScheduleProductImages() {
      return this.isShopRouteActive && this.isProductPanelVisible
    }
  },
  watch: {
    '$route.name': {
      immediate: true,
      handler(routeName) {
        // 路由切换开始时立即暂停，不能等页面离场动画结束后才触发 deactivated。
        this.isShopRouteActive = routeName === 'shop'

        if (this.isShopRouteActive) {
          this.startProductImageQueue()
        }
      }
    }
  },
  methods: {
    async loadProducts() {
      const imageLoadVersion = this.productImageLoadVersion + 1
      this.productImageLoadVersion = imageLoadVersion
      this.isProductLoading = true
      this.productErrorMessage = ''

      try {
        const products = await getShopProducts()

        if (imageLoadVersion !== this.productImageLoadVersion) {
          return
        }

        this.revokeProductImageUrls()
        this.products = products
        this.startProductImageQueue()
      } catch (error) {
        if (imageLoadVersion === this.productImageLoadVersion) {
          this.productErrorMessage = error.message || '奖品列表加载失败'
        }
      } finally {
        if (imageLoadVersion === this.productImageLoadVersion) {
          this.isProductLoading = false
        }
      }
    },
    async loadPointFlow() {
      this.isPointFlowLoading = true
      this.pointFlowErrorMessage = ''

      try {
        const pointRecords = await getShopPointFlow()
        this.pointRecords = pointRecords
        this.availablePoints = getLatestPointBalance(pointRecords)
      } catch (error) {
        this.pointFlowErrorMessage = error.message || '积分流水加载失败'
      } finally {
        this.isPointFlowLoading = false
      }
    },
    async loadRedeemWindow() {
      setSeasonAvailability('loading')

      try {
        // 兑换资格会影响扣减积分，进入商城时始终刷新当前赛季，避免 KeepAlive 缓存跨赛季后沿用旧日期。
        this.currentSeason = await getCurrentSeason()

        setCurrentSeason(this.currentSeason)
        setSeasonAvailability('active')
        this.updateRedeemAvailability()
      } catch (error) {
        this.currentSeason = null
        setCurrentSeason(null)
        setSeasonAvailability(isNoActiveSeasonError(error) ? 'unavailable' : 'error')
        this.redeemAvailability = {
          isAvailable: false,
          message: isNoActiveSeasonError(error) ? '当前暂无激活赛季，兑换敬请期待' : '暂无法确认赛季兑换时间',
          nextChangeAt: null
        }
        this.clearRedeemWindowTimer()
      }
    },
    updateRedeemAvailability() {
      const seasonWriteAvailability = getSeasonWriteAvailability(this.currentSeason)
      const shopRedeemAvailability = getShopRedeemAvailability(this.currentSeason)

      if (seasonWriteAvailability.isFrozen) {
        this.redeemAvailability = {
          isAvailable: false,
          message: seasonWriteAvailability.remainingHours
            ? `兑换将在 ${seasonWriteAvailability.remainingHours} 小时后开放，商品和积分流水可提前查看。`
            : '兑换尚未开放，商品和积分流水可提前查看。',
          nextChangeAt: seasonWriteAvailability.nextChangeAt
        }
      } else {
        // 赛季尚未开始时同时等待保护期起点，确保页面停留跨过零点后立即切为只读。
        const nextChangeTimes = [
          seasonWriteAvailability.nextChangeAt,
          shopRedeemAvailability.nextChangeAt
        ].filter(Number.isFinite)

        this.redeemAvailability = {
          ...shopRedeemAvailability,
          nextChangeAt: nextChangeTimes.length ? Math.min(...nextChangeTimes) : null
        }
      }

      this.scheduleRedeemWindowUpdate()
    },
    scheduleRedeemWindowUpdate() {
      this.clearRedeemWindowTimer()

      if (!this.redeemAvailability.nextChangeAt) {
        return
      }

      const delay = getSeasonWriteUpdateDelay(this.redeemAvailability.nextChangeAt)
      this.redeemWindowTimer = window.setTimeout(() => {
        this.redeemWindowTimer = null
        this.updateRedeemAvailability()
      }, delay)
    },
    clearRedeemWindowTimer() {
      if (this.redeemWindowTimer) {
        window.clearTimeout(this.redeemWindowTimer)
        this.redeemWindowTimer = null
      }
    },
    async consumeProduct(product) {
      // 二次确认后仍重新计算一次，防止页面停留到兑换窗口结束后继续提交。
      this.updateRedeemAvailability()

      if (!this.redeemAvailability.isAvailable) {
        throw new Error(this.redeemAvailability.message)
      }

      return consumeShopProduct(product.id)
    },
    handleConsumeSuccess({ product, result }) {
      const exchangeRecord = {
        id: `exchange-${product.id}-${result.createdAt}`,
        type: 'expense',
        changeType: 'exchange',
        productName: product.name,
        occurredAt: result.createdAt,
        title: `兑换${product.name}`,
        description: '积分商城兑换',
        amount: -product.pointsRequired,
        balanceAfter: result.pointsAfter
      }

      this.availablePoints = result.pointsAfter
      this.pointRecords = [exchangeRecord, ...this.pointRecords]
        .sort((current, next) => new Date(next.occurredAt) - new Date(current.occurredAt))
    },
    handleProductPanelVisibilityChange(isVisible) {
      this.isProductPanelVisible = isVisible

      if (isVisible) {
        this.startProductImageQueue()
      }
    },
    hasPendingProductImages() {
      return this.products.some(product => (
        product.imageFilename &&
        !product.imageSrc &&
        !product.isImageFailed
      ))
    },
    startProductImageQueue() {
      if (!this.canScheduleProductImages || this.isProductImageQueueRunning || !this.hasPendingProductImages()) {
        return
      }

      const imageLoadVersion = this.productImageLoadVersion
      this.isProductImageQueueRunning = true

      this.loadProductImagesByTier(imageLoadVersion)
        .finally(() => {
          this.isProductImageQueueRunning = false

          // 列表刷新或短暂暂停后，从尚未缓存的第一张图片继续调度。
          if (this.canScheduleProductImages) {
            this.startProductImageQueue()
          }
        })
    },
    async loadProductImagesByTier(imageLoadVersion) {
      const tierGroups = groupProductsByTier(this.products)

      for (const tier of tierGroups) {
        for (const product of tier.items) {
          if (imageLoadVersion !== this.productImageLoadVersion || !this.canScheduleProductImages) {
            return
          }

          await this.loadProductImage(product, imageLoadVersion)
        }
      }
    },
    async loadProductImage(product, imageLoadVersion) {
      const currentProduct = this.products.find(item => item.id === product.id)

      if (!currentProduct?.imageFilename || currentProduct.imageSrc || currentProduct.isImageFailed) {
        return
      }

      try {
        this.products = this.products.map(item => item.id === product.id
          ? {
              ...item,
              isImageLoading: true,
              isImageLoaded: false,
              isImageFailed: false
            }
          : item)

        const imageSrc = await getShopProductImageSrc(currentProduct.imageFilename, {
          // 每次首次请求及退避重试前检查，隐藏页面期间不再产生新的图片请求。
          shouldStartRequest: () => (
            imageLoadVersion === this.productImageLoadVersion &&
            this.canScheduleProductImages
          )
        })

        if (imageLoadVersion !== this.productImageLoadVersion) {
          if (imageSrc.startsWith('blob:')) {
            URL.revokeObjectURL(imageSrc)
          }
          return
        }

        this.products = this.products.map(item => item.id === product.id
          ? {
              ...item,
              imageSrc,
              isImageLoading: true,
              isImageLoaded: false,
              isImageFailed: false
            }
          : item)
      } catch (error) {
        if (imageLoadVersion !== this.productImageLoadVersion) {
          return
        }

        if (isProductImageRequestPausedError(error)) {
          return
        }

        // 已发出的请求即使在离场后失败，也缓存最终失败态，避免返回商城时重复请求明确无效的图片。
        this.products = this.products.map(item => item.id === product.id
          ? {
              ...item,
              isImageLoading: false,
              isImageLoaded: false,
              isImageFailed: true
            }
          : item)
      }
    },
    markProductImageLoaded(productId) {
      this.products = this.products.map(item => item.id === productId
        ? {
            ...item,
            isImageLoading: false,
            isImageLoaded: true,
            isImageFailed: false
          }
        : item)
    },
    markProductImageFailed(productId) {
      const product = this.products.find(item => item.id === productId)

      if (product?.imageSrc?.startsWith('blob:')) {
        URL.revokeObjectURL(product.imageSrc)
      }

      // Blob 已下载但浏览器解码失败时，不应让 shimmer 永远停留，应退回到奖品名称占位。
      this.products = this.products.map(item => item.id === productId
        ? {
            ...item,
            imageSrc: '',
            isImageLoading: false,
            isImageLoaded: false,
            isImageFailed: true
          }
        : item)
    },
    revokeProductImageUrls() {
      this.products.forEach(product => {
        if (product.imageSrc?.startsWith('blob:')) {
          URL.revokeObjectURL(product.imageSrc)
        }
      })
    }
  }
}
</script>
