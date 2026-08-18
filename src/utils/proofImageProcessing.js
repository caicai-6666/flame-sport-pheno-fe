export const MAX_PROOF_IMAGE_COUNT = 5
export const PROOF_IMAGE_MIME_TYPE = 'image/webp'

const MAX_PROOF_IMAGE_BYTES = 5 * 1024 * 1024
const INITIAL_IMAGE_MAX_EDGE = 1920
const MIN_IMAGE_MAX_EDGE = 320
const WEBP_QUALITY_STEPS = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42]
const LONG_PROOF_WEBP_QUALITY_STEPS = [0.94, 0.9, 0.86, 0.82, 0.78, 0.74]
const LONG_PROOF_MAX_WIDTH = 1440
const LONG_PROOF_MIN_WIDTH = 960
const LONG_PROOF_MAX_HEIGHT = 16000
const LONG_PROOF_PADDING = 16
const LONG_PROOF_GAP = 16

let nativeWebpEncodingSupported = null
let wasmWebpEncoderPromise = null

export function getProofFileBaseName(fileName) {
  const safeFileName = String(fileName || '').split(/[/\\]/).pop() || ''
  const baseName = safeFileName.replace(/\.[^.]*$/, '').trim()

  return baseName || 'proof'
}

export function sanitizeProofFileBaseName(value) {
  return String(value || '')
    .replace(/[\\/:*?"<>|#%{}^~[\]`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
}

export function toProofWebpFileName(baseName) {
  return `${sanitizeProofFileBaseName(baseName) || 'proof'}.webp`
}

function getImageSizeForMaxEdge(width, height, maxEdge) {
  const longestEdge = Math.max(width, height)

  if (longestEdge <= maxEdge) {
    return { width, height }
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

function hasWebpSignature(buffer) {
  const bytes = new Uint8Array(buffer)

  return bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
}

function readBlobHeader(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('图片转换结果读取失败，请重新选择图片'))
    reader.readAsArrayBuffer(blob.slice(0, 12))
  })
}

async function isWebpBlob(blob) {
  if (!blob || blob.type !== PROOF_IMAGE_MIME_TYPE) {
    return false
  }

  return hasWebpSignature(await readBlobHeader(blob))
}

function canvasToNativeWebpBlob(canvas, quality) {
  return new Promise(resolve => {
    if (typeof canvas.toBlob !== 'function') {
      resolve(null)
      return
    }

    canvas.toBlob(resolve, PROOF_IMAGE_MIME_TYPE, quality)
  })
}

async function loadWasmWebpEncoder() {
  if (typeof WebAssembly !== 'object' || typeof WebAssembly.instantiate !== 'function') {
    throw new Error('当前钉钉不支持 WebP 兼容转换，请升级钉钉后重试')
  }

  if (!wasmWebpEncoderPromise) {
    // 仅在原生 Canvas 无法编码 WebP 时加载 WASM，避免兼容设备承担额外下载和初始化成本。
    wasmWebpEncoderPromise = import(/* webpackChunkName: "webp-encoder" */ '@jsquash/webp/encode.js')
      .then(module => module.default)
      .catch(error => {
        wasmWebpEncoderPromise = null
        throw error
      })
  }

  return wasmWebpEncoderPromise
}

async function canvasToWasmWebpBlob(canvas, quality) {
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('当前浏览器无法处理图片，请更换浏览器后重试')
  }

  try {
    const encodeWebp = await loadWasmWebpEncoder()
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
    const buffer = await encodeWebp(imageData, {
      quality: Math.round(quality * 100)
    })

    if (!hasWebpSignature(buffer)) {
      throw new Error('WASM 编码结果不是有效的 WebP 图片')
    }

    return new Blob([buffer], { type: PROOF_IMAGE_MIME_TYPE })
  } catch (error) {
    if (error?.message?.startsWith('当前')) {
      throw error
    }

    throw new Error('WebP 兼容转换失败，请重试或升级钉钉')
  }
}

async function canvasToWebpBlob(canvas, quality) {
  if (nativeWebpEncodingSupported !== false) {
    const nativeBlob = await canvasToNativeWebpBlob(canvas, quality)

    if (await isWebpBlob(nativeBlob)) {
      nativeWebpEncodingSupported = true
      return nativeBlob
    }

    // HTML 标准允许不支持指定编码时回退 PNG；钉钉旧 WebView 命中后统一切换 WASM。
    nativeWebpEncodingSupported = false
  }

  return canvasToWasmWebpBlob(canvas, quality)
}

async function compressDrawableToWebp(drawable, sourceWidth, sourceHeight) {
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
    // 凭证统一铺白底，避免透明原图在审核端的深色背景上变得难以辨认。
    context.fillStyle = '#fff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(drawable, 0, 0, canvas.width, canvas.height)

    for (const quality of WEBP_QUALITY_STEPS) {
      const blob = await canvasToWebpBlob(canvas, quality)

      if (blob.size <= MAX_PROOF_IMAGE_BYTES) {
        return blob
      }
    }

    maxEdge = Math.floor(maxEdge * 0.82)
  }

  throw new Error('图片压缩后仍超过 5MB，请更换图片')
}

export async function compressImageToWebp(file) {
  const image = await loadImage(file)

  return compressDrawableToWebp(
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

export async function composeProofImagesToWebp(files) {
  const images = await Promise.all(files.map(loadImage))
  const widestImage = Math.max(...images.map(image => image.naturalWidth || image.width))
  const initialWidth = Math.min(LONG_PROOF_MAX_WIDTH, widestImage + LONG_PROOF_PADDING * 2)
  const minimumWidth = Math.min(initialWidth, LONG_PROOF_MIN_WIDTH)
  let canvasWidth = initialWidth

  while (canvasWidth >= minimumWidth) {
    const canvas = createLongProofCanvas(images, canvasWidth)

    if (canvas) {
      for (const quality of LONG_PROOF_WEBP_QUALITY_STEPS) {
        const blob = await canvasToWebpBlob(canvas, quality)

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
