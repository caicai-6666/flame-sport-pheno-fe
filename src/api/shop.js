import request from './request'

const PRODUCT_ACCENTS = [
  '#72d84f',
  '#20c7b5',
  '#ff9f45',
  '#7b8cff',
  '#3fb06d',
  '#ff6f91',
  '#4f9cff',
  '#f2c94c',
  '#bb6bd9',
  '#2ec4b6'
]

const PRODUCT_IMAGE_MAX_ATTEMPTS = 3
const PRODUCT_IMAGE_RETRY_DELAYS = [600, 1400]

function waitForProductImageRetry(delay) {
  return new Promise(resolve => window.setTimeout(resolve, delay))
}

function isRetriableProductImageError(error) {
  const status = Number(error?.status)

  // 无 HTTP 状态通常表示超时、断网或连接中断；明确的客户端错误不应重复占用网络。
  return !status || status === 408 || status === 429 || status >= 500
}

function toProductList(response) {
  if (Array.isArray(response)) {
    return response
  }

  if (Array.isArray(response?.products)) {
    return response.products
  }

  if (Array.isArray(response?.records)) {
    return response.records
  }

  if (Array.isArray(response?.list)) {
    return response.list
  }

  if (Array.isArray(response?.data)) {
    return response.data
  }

  return []
}

function toPointFlowList(response) {
  if (Array.isArray(response)) {
    return response
  }

  if (Array.isArray(response?.point_flows)) {
    return response.point_flows
  }

  if (Array.isArray(response?.records)) {
    return response.records
  }

  if (Array.isArray(response?.list)) {
    return response.list
  }

  if (Array.isArray(response?.data)) {
    return response.data
  }

  return []
}

function normalizeImageFilename(imageUrl) {
  if (!imageUrl) {
    return ''
  }

  const [pathWithoutQuery] = imageUrl.split('?')
  const segments = pathWithoutQuery.split('/').filter(Boolean)

  return segments[segments.length - 1] || ''
}

function normalizeProduct(product, index) {
  const pointsRequired = Number(product.points_required ?? product.pointsRequired ?? 0)

  return {
    id: String(product.id || product.product_id || product.productId || `${product.name || 'product'}-${index}`),
    name: product.name || product.product_name || product.productName || '未命名奖品',
    description: product.description || '',
    pointsRequired: Number.isNaN(pointsRequired) ? 0 : pointsRequired,
    imageUrl: product.image_url || product.imageUrl || '',
    imageFilename: normalizeImageFilename(product.image_url || product.imageUrl || ''),
    imageSrc: '',
    isImageLoading: Boolean(product.image_url || product.imageUrl),
    isImageLoaded: false,
    isImageFailed: false,
    accent: PRODUCT_ACCENTS[index % PRODUCT_ACCENTS.length]
  }
}

function normalizePointFlowRecord(record, index) {
  const amount = Number(record.change_points ?? record.changePoints ?? 0)
  const balanceAfter = Number(record.points_after ?? record.pointsAfter ?? 0)
  const changeType = record.change_type || record.changeType || ''
  const productName = record.product_name || record.productName || ''
  const description = record.description || ''
  const occurredAt = record.created_at || record.createdAt || ''

  return {
    id: String(record.id || record.point_record_id || `${changeType || 'point'}-${occurredAt || index}`),
    type: amount >= 0 ? 'income' : 'expense',
    changeType,
    productName,
    occurredAt,
    title: getPointFlowTitle({ changeType, productName, description }),
    description: getPointFlowDescription({ changeType, description }),
    amount: Number.isNaN(amount) ? 0 : amount,
    balanceAfter: Number.isNaN(balanceAfter) ? 0 : balanceAfter
  }
}

function normalizeProductId(productId) {
  const numericProductId = Number(productId)

  if (String(productId).trim() && Number.isInteger(numericProductId)) {
    return numericProductId
  }

  return productId
}

function normalizeConsumeResult(response) {
  const pointsAfter = Number(response?.points_after ?? response?.pointsAfter ?? 0)

  return {
    pointsAfter: Number.isNaN(pointsAfter) ? 0 : pointsAfter,
    createdAt: response?.created_at || response?.createdAt || new Date().toISOString()
  }
}

function getPointFlowTitle(record) {
  if (record.changeType === 'season_reward') {
    return record.description || '赛季达标奖励'
  }

  if (record.changeType === 'exchange') {
    return record.productName ? `兑换${record.productName}` : '商品兑换'
  }

  return record.description || '积分变动'
}

function getPointFlowDescription(record) {
  if (record.changeType === 'season_reward') {
    return '赛季奖励'
  }

  return record.description || '积分流水'
}

export async function getShopProductImageSrc(filename) {
  if (!filename) {
    return ''
  }

  let lastError

  for (let attempt = 0; attempt < PRODUCT_IMAGE_MAX_ATTEMPTS; attempt += 1) {
    try {
      const imageBlob = await request.get('/image/product', {
        params: {
          filename
        },
        responseType: 'blob'
      })

      if (!imageBlob?.size) {
        throw new Error('奖品图片内容为空')
      }

      return URL.createObjectURL(imageBlob)
    } catch (error) {
      lastError = error

      const isLastAttempt = attempt === PRODUCT_IMAGE_MAX_ATTEMPTS - 1
      if (isLastAttempt || !isRetriableProductImageError(error)) {
        throw error
      }

      // 图片按档位串行加载，短暂退避后再试，既降低瞬时失败概率，也避免集中重试压垮服务端。
      await waitForProductImageRetry(PRODUCT_IMAGE_RETRY_DELAYS[attempt])
    }
  }

  throw lastError
}

/**
 * 获取积分商城奖品列表。
 *
 * 此处只获取商品基础信息，图片由页面按档位逐批加载。
 */
export async function getShopProducts() {
  const response = await request.get('/shop/product_info')

  return toProductList(response).map(normalizeProduct)
}

/**
 * 获取用户积分流水。
 *
 * 前端按 created_at 降序展示；可用积分取最新一条流水的 points_after。
 */
export async function getShopPointFlow() {
  const response = await request.get('/shop/point_flow')

  return toPointFlowList(response)
    .map(normalizePointFlowRecord)
    .sort((current, next) => new Date(next.occurredAt) - new Date(current.occurredAt))
}

/**
 * 兑换商城奖品。
 */
export async function consumeShopProduct(productId) {
  const response = await request.post('/shop/consume', {
    product_id: normalizeProductId(productId)
  })

  return normalizeConsumeResult(response)
}

export function getLatestPointBalance(pointRecords) {
  return pointRecords[0]?.balanceAfter || 0
}
