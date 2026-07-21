<template>
  <ShopPage
    :products="products"
    :is-product-loading="isProductLoading"
    :product-error-message="productErrorMessage"
    :point-records="pointRecords"
    :initial-available-points="availablePoints"
    :is-point-flow-loading="isPointFlowLoading"
    :point-flow-error-message="pointFlowErrorMessage"
    :consume-product="consumeProduct"
    @retry-products="loadProducts"
    @retry-point-flow="loadPointFlow"
    @consume-success="handleConsumeSuccess"
    @product-image-loaded="markProductImageLoaded"
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
import { groupProductsByTier } from '../utils/shopProductTiers'

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
      productImageLoadVersion: 0
    }
  },
  created() {
    this.loadProducts()
    this.loadPointFlow()
  },
  beforeUnmount() {
    this.productImageLoadVersion += 1
    this.revokeProductImageUrls()
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
    async consumeProduct(product) {
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
