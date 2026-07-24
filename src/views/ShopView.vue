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
  />
</template>

<script>
import ShopPage from '../components/ShopPage.vue'
import {
  consumeShopProduct,
  getLatestPointBalance,
  getShopPointFlow,
  getShopProducts,
  getShopProductImageSrc
} from '../api/shop'
import { getCurrentSeason, isNoActiveSeasonError } from '../api/season'
import { appState, setCurrentSeason, setSeasonAvailability } from '../state/appState'
import { groupProductsByTier } from '../utils/shopProductTiers'
import { getShopRedeemAvailability } from '../utils/shopRedeemWindow'

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
  beforeUnmount() {
    this.productImageLoadVersion += 1
    this.revokeProductImageUrls()
    this.clearRedeemWindowTimer()
  },
  computed: {
    isNoActiveSeason() {
      return appState.seasonAvailability === 'unavailable'
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
        this.loadProductImagesByTier(imageLoadVersion)
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
      this.redeemAvailability = getShopRedeemAvailability(this.currentSeason)
      this.scheduleRedeemWindowUpdate()
    },
    scheduleRedeemWindowUpdate() {
      this.clearRedeemWindowTimer()

      if (!this.redeemAvailability.nextChangeAt) {
        return
      }

      const delay = Math.max(this.redeemAvailability.nextChangeAt - Date.now() + 100, 0)
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
    async loadProductImagesByTier(imageLoadVersion) {
      const tierGroups = groupProductsByTier(this.products)

      for (const tier of tierGroups) {
        for (const product of tier.items) {
          if (imageLoadVersion !== this.productImageLoadVersion) {
            return
          }

          await this.loadProductImage(product, imageLoadVersion)
        }
      }
    },
    async loadProductImage(product, imageLoadVersion) {
      if (!product.imageFilename || product.imageSrc) {
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

        const imageSrc = await getShopProductImageSrc(product.imageFilename)

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
      } catch {
        if (imageLoadVersion !== this.productImageLoadVersion) {
          return
        }

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
