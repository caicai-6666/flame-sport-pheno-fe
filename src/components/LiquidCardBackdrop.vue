<template>
  <div
    ref="host"
    class="liquid-card-backdrop"
    :class="{ 'is-ready': isReady }"
    aria-hidden="true"
  ></div>
</template>

<script>
import { markRaw } from 'vue'

const DISPLACEMENT_TEXTURE_SIZE = 128

const LIQUID_VARIANTS = {
  rank: {
    background: 0x091a11,
    backgroundGlow: 0x174e2d,
    backgroundDeep: 0x0d3822,
    atmospherePrimary: 0x72d84f,
    atmosphereSecondary: 0x12b86a,
    liquidPrimary: 0x48e85b,
    liquidSecondary: 0x0eae58,
    liquidAccent: 0x9bff78,
    liquidEdge: 0x45ffd0,
    highlight: 0xd9ffc7,
    particle: 0xbaff9e,
    wave: [0.82, 0.28, 1.12, 0.26],
    waveSecondary: [1.02, 0.52, 1.16, 0.48],
    displacement: [28, 18],
    flow: [0.026, 0.014],
    rotation: 1
  },
  project: {
    background: 0x07190d,
    backgroundGlow: 0x245a20,
    backgroundDeep: 0x123d17,
    atmospherePrimary: 0x9df15d,
    atmosphereSecondary: 0x36d04d,
    liquidPrimary: 0x7bea50,
    liquidSecondary: 0x21a943,
    liquidAccent: 0xd3ff8f,
    liquidEdge: 0x72f3a2,
    highlight: 0xf0ffd4,
    particle: 0xd8ffad,
    wave: [0.72, 0.18, 1.04, 0.36],
    waveSecondary: [0.96, 0.44, 1.1, 0.58],
    displacement: [32, 15],
    flow: [0.03, 0.009],
    rotation: -1
  },
  history: {
    background: 0x211006,
    backgroundGlow: 0x713415,
    backgroundDeep: 0x421b0a,
    atmospherePrimary: 0xffa044,
    atmosphereSecondary: 0xd75f20,
    liquidPrimary: 0xffa64d,
    liquidSecondary: 0xd95c1f,
    liquidAccent: 0xffd37b,
    liquidEdge: 0xa6d85c,
    highlight: 0xffebc2,
    particle: 0xffd28a,
    wave: [0.36, 0.88, -0.08, 0.72],
    waveSecondary: [0.6, 1.02, 0.12, 0.9],
    displacement: [21, 27],
    flow: [-0.012, 0.026],
    rotation: 0.72
  },
  supplement: {
    background: 0x160d2e,
    backgroundGlow: 0x54216f,
    backgroundDeep: 0x28103d,
    atmospherePrimary: 0xff7a45,
    atmosphereSecondary: 0x9a6bff,
    liquidPrimary: 0xff7043,
    liquidSecondary: 0x6e3fd5,
    liquidAccent: 0xffcb70,
    liquidEdge: 0x5fe0ca,
    highlight: 0xffefc2,
    particle: 0xffd994,
    wave: [0.24, 0.82, 0.08, 0.68],
    waveSecondary: [0.52, 1.04, 0.34, 0.92],
    displacement: [30, 22],
    flow: [-0.022, 0.018],
    rotation: -1.08
  },
  shop: {
    background: 0x041b19,
    backgroundGlow: 0x0b5a51,
    backgroundDeep: 0x073d38,
    atmospherePrimary: 0x20c7b5,
    atmosphereSecondary: 0x36d49d,
    liquidPrimary: 0x28d9c2,
    liquidSecondary: 0x078f87,
    liquidAccent: 0x91fff0,
    liquidEdge: 0x72d84f,
    highlight: 0xd6fff9,
    particle: 0x9bfff0,
    wave: [0.94, 0.38, 0.88, 0.18],
    waveSecondary: [1.08, 0.58, 1.04, 0.42],
    displacement: [18, 30],
    flow: [0.014, -0.024],
    rotation: -0.82
  }
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl')

    context?.getExtension('WEBGL_lose_context')?.loseContext()

    return Boolean(context)
  } catch (error) {
    return false
  }
}

function createDisplacementCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = DISPLACEMENT_TEXTURE_SIZE
  canvas.height = DISPLACEMENT_TEXTURE_SIZE

  const context = canvas.getContext('2d')
  const imageData = context.createImageData(DISPLACEMENT_TEXTURE_SIZE, DISPLACEMENT_TEXTURE_SIZE)
  const fullTurn = Math.PI * 2

  for (let y = 0; y < DISPLACEMENT_TEXTURE_SIZE; y += 1) {
    for (let x = 0; x < DISPLACEMENT_TEXTURE_SIZE; x += 1) {
      const offset = (y * DISPLACEMENT_TEXTURE_SIZE + x) * 4
      const normalizedX = x / DISPLACEMENT_TEXTURE_SIZE
      const normalizedY = y / DISPLACEMENT_TEXTURE_SIZE
      const horizontalWave = Math.sin((normalizedX * 2 + normalizedY) * fullTurn)
      const verticalWave = Math.cos((normalizedY * 2 - normalizedX) * fullTurn)

      imageData.data[offset] = 128 + horizontalWave * 70
      imageData.data[offset + 1] = 128 + verticalWave * 70
      imageData.data[offset + 2] = 128
      imageData.data[offset + 3] = 255
    }
  }

  context.putImageData(imageData, 0, 0)

  return canvas
}

export default {
  name: 'LiquidCardBackdrop',
  props: {
    variant: {
      type: String,
      default: 'rank',
      validator: value => Object.prototype.hasOwnProperty.call(LIQUID_VARIANTS, value)
    }
  },
  data() {
    return {
      isReady: false,
      pixiApplication: null,
      backgroundGraphics: null,
      atmosphereGraphics: null,
      liquidContainer: null,
      liquidGraphics: null,
      causticContainer: null,
      causticGraphics: null,
      particleGraphics: null,
      displacementSprite: null,
      displacementFilter: null,
      causticDisplacementFilter: null,
      animationElapsed: 0,
      animationTick: null,
      resizeObserver: null,
      motionQuery: null,
      initializationVersion: 0,
      isComponentActive: true
    }
  },
  computed: {
    effectConfig() {
      return LIQUID_VARIANTS[this.variant] || LIQUID_VARIANTS.rank
    }
  },
  mounted() {
    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (this.motionQuery.addEventListener) {
      this.motionQuery.addEventListener('change', this.handleMotionPreferenceChange)
    } else {
      this.motionQuery.addListener?.(this.handleMotionPreferenceChange)
    }
    document.addEventListener('visibilitychange', this.syncTickerState)

    if (typeof ResizeObserver === 'function') {
      this.resizeObserver = new ResizeObserver(this.resizeCanvas)
      this.resizeObserver.observe(this.$refs.host)
    } else {
      window.addEventListener('resize', this.resizeCanvas)
    }

    if (!this.motionQuery.matches) {
      this.initializePixi()
    }
  },
  activated() {
    this.isComponentActive = true
    this.syncTickerState()
  },
  deactivated() {
    this.isComponentActive = false
    this.pixiApplication?.ticker.stop()
  },
  beforeUnmount() {
    this.initializationVersion += 1
    if (this.motionQuery?.removeEventListener) {
      this.motionQuery.removeEventListener('change', this.handleMotionPreferenceChange)
    } else {
      this.motionQuery?.removeListener?.(this.handleMotionPreferenceChange)
    }
    document.removeEventListener('visibilitychange', this.syncTickerState)
    window.removeEventListener('resize', this.resizeCanvas)
    this.resizeObserver?.disconnect()
    this.destroyPixi()
  },
  methods: {
    async initializePixi() {
      if (this.pixiApplication || !supportsWebGL()) {
        return
      }

      const initializationVersion = this.initializationVersion + 1
      this.initializationVersion = initializationVersion
      let pendingApplication = null

      try {
        // 含液体卡片的页面进入时才加载 GPU 渲染依赖，避免应用首屏承担 PixiJS 包体。
        const pixi = await import(/* webpackChunkName: "pixi-liquid-card" */ '../utils/liquidCardPixi')
        const app = new pixi.Application()
        pendingApplication = app
        const bounds = this.$refs.host.getBoundingClientRect()

        await app.init({
          width: Math.max(Math.round(bounds.width), 1),
          height: Math.max(Math.round(bounds.height), 1),
          preference: 'webgl',
          preferWebGLVersion: 1,
          backgroundAlpha: 0,
          antialias: false,
          autoDensity: true,
          resolution: Math.min(window.devicePixelRatio || 1, 1.5),
          powerPreference: 'low-power'
        })

        if (initializationVersion !== this.initializationVersion || !this.$refs.host) {
          app.destroy({ removeView: true }, true)
          return
        }

        this.pixiApplication = markRaw(app)
        this.createLiquidScene(pixi)

        app.canvas.className = 'liquid-card-canvas'
        app.canvas.addEventListener('webglcontextlost', this.handleContextLost)
        this.$refs.host.appendChild(app.canvas)
        this.resizeCanvas()
        this.isReady = true
        this.syncTickerState()
      } catch (error) {
        // 钉钉 WebView 无法创建 GPU 上下文时保留原 CSS 背景，不影响卡片内容。
        if (pendingApplication && pendingApplication !== this.pixiApplication) {
          try {
            pendingApplication.destroy({ removeView: true }, true)
          } catch (destroyError) {
            // 部分初始化的渲染器不一定具备完整销毁链，此时交给浏览器回收临时画布。
          }
        }
        this.destroyPixi()
      }
    },
    createLiquidScene({ BlurFilter, Container, DisplacementFilter, Graphics, Sprite, Texture }) {
      const backgroundGraphics = new Graphics()
      const atmosphereGraphics = new Graphics()
      const liquidContainer = new Container()
      const liquidGraphics = new Graphics()
      const causticContainer = new Container()
      const causticGraphics = new Graphics()
      const particleGraphics = new Graphics()
      const displacementTexture = Texture.from(createDisplacementCanvas())
      const config = this.effectConfig

      displacementTexture.source.addressMode = 'repeat'

      const displacementSprite = new Sprite({ texture: displacementTexture })
      const displacementFilter = new DisplacementFilter({
        sprite: displacementSprite,
        scale: { x: config.displacement[0], y: config.displacement[1] },
        padding: 48
      })
      const liquidBlur = new BlurFilter({
        strength: 7,
        quality: 2,
        resolution: 0.75
      })
      const atmosphereBlur = new BlurFilter({
        strength: 22,
        quality: 2,
        resolution: 0.5
      })
      const causticDisplacementFilter = new DisplacementFilter({
        sprite: displacementSprite,
        scale: { x: 16, y: 9 },
        padding: 32
      })

      liquidContainer.addChild(liquidGraphics)
      liquidContainer.filters = [displacementFilter, liquidBlur]
      atmosphereGraphics.filters = [atmosphereBlur]
      causticContainer.addChild(causticGraphics)
      causticContainer.filters = [causticDisplacementFilter]
      this.pixiApplication.stage.addChild(
        backgroundGraphics,
        atmosphereGraphics,
        liquidContainer,
        causticContainer,
        particleGraphics,
        displacementSprite
      )

      this.backgroundGraphics = markRaw(backgroundGraphics)
      this.atmosphereGraphics = markRaw(atmosphereGraphics)
      this.liquidContainer = markRaw(liquidContainer)
      this.liquidGraphics = markRaw(liquidGraphics)
      this.causticContainer = markRaw(causticContainer)
      this.causticGraphics = markRaw(causticGraphics)
      this.particleGraphics = markRaw(particleGraphics)
      this.displacementSprite = markRaw(displacementSprite)
      this.displacementFilter = markRaw(displacementFilter)
      this.causticDisplacementFilter = markRaw(causticDisplacementFilter)
      this.animationTick = ticker => this.animateLiquid(ticker.deltaMS)
      this.pixiApplication.ticker.add(this.animationTick)
    },
    drawLiquid(width, height) {
      const background = this.backgroundGraphics
      const atmosphere = this.atmosphereGraphics
      const graphics = this.liquidGraphics
      const caustics = this.causticGraphics
      const particles = this.particleGraphics
      const config = this.effectConfig
      const edge = 64

      if (!background || !atmosphere || !graphics || !caustics || !particles) {
        return
      }

      background.clear()
      atmosphere.clear()
      graphics.clear()
      caustics.clear()
      particles.clear()

      background
        .rect(0, 0, width, height)
        .fill({ color: config.background })

      background
        // 主题色底层越过左边界，与下方椭圆重叠，避免左上角露出纯深色底斑。
        .ellipse(width * 0.62, height * 0.08, width * 0.78, height * 1.08)
        .fill({ color: config.backgroundGlow, alpha: 0.86 })

      background
        .ellipse(width * 0.08, height * 1.04, width * 0.72, height * 0.96)
        .fill({ color: config.backgroundDeep, alpha: 0.9 })

      atmosphere
        .circle(width * 0.84, height * 0.18, Math.max(width, height) * 0.25)
        .fill({ color: config.atmospherePrimary, alpha: 0.42 })

      atmosphere
        .circle(width * 0.3, height * 0.92, Math.max(width, height) * 0.2)
        .fill({ color: config.atmosphereSecondary, alpha: 0.34 })

      graphics
        .moveTo(-edge, height * config.wave[0])
        .bezierCurveTo(
          width * 0.16,
          height * config.wave[1],
          width * 0.5,
          height * config.wave[2],
          width + edge,
          height * config.wave[3]
        )
        .lineTo(width + edge, height + edge)
        .lineTo(-edge, height + edge)
        .closePath()
        .fill({ color: config.liquidPrimary, alpha: 0.62 })

      graphics
        .moveTo(-edge, height * config.waveSecondary[0])
        .bezierCurveTo(
          width * 0.26,
          height * config.waveSecondary[1],
          width * 0.66,
          height * config.waveSecondary[2],
          width + edge,
          height * config.waveSecondary[3]
        )
        .lineTo(width + edge, height + edge)
        .lineTo(-edge, height + edge)
        .closePath()
        .fill({ color: config.liquidSecondary, alpha: 0.74 })

      graphics
        .ellipse(width * 0.88, height * 0.06, width * 0.34, height * 0.62)
        .fill({ color: config.liquidAccent, alpha: 0.72 })

      graphics
        .ellipse(width * 0.12, height * 0.98, width * 0.3, height * 0.5)
        .fill({ color: config.liquidEdge, alpha: 0.32 })

      caustics
        .moveTo(-edge, height * 0.7)
        .bezierCurveTo(width * 0.22, height * 0.38, width * 0.52, height * 0.96, width + edge, height * 0.36)
        .stroke({ width: 2.2, color: config.highlight, alpha: 0.62 })

      caustics
        .moveTo(-edge, height * 0.82)
        .bezierCurveTo(width * 0.3, height * 0.5, width * 0.62, height * 1.02, width + edge, height * 0.48)
        .stroke({ width: 1, color: 0xffffff, alpha: 0.42 })

      const particleCount = 22

      for (let index = 0; index < particleCount; index += 1) {
        const particleX = ((index * 47) % 101) / 100 * width
        const particleY = ((index * 31 + 17) % 97) / 100 * height
        const radius = 0.7 + (index % 4) * 0.45

        particles
          .circle(particleX, particleY, radius)
          .fill({ color: index % 3 === 0 ? config.particle : 0xffffff, alpha: 0.18 + (index % 5) * 0.07 })
      }

      this.liquidContainer.pivot.set(width / 2, height / 2)
      this.liquidContainer.position.set(width / 2, height / 2)
      this.causticContainer.pivot.set(width / 2, height / 2)
      this.causticContainer.position.set(width / 2, height / 2)
    },
    resizeCanvas() {
      if (!this.pixiApplication || !this.$refs.host) {
        return
      }

      const bounds = this.$refs.host.getBoundingClientRect()
      const width = Math.max(Math.round(bounds.width), 1)
      const height = Math.max(Math.round(bounds.height), 1)

      this.pixiApplication.renderer.resize(width, height)
      this.drawLiquid(width, height)
    },
    animateLiquid(deltaMs) {
      if (!this.displacementSprite || !this.displacementFilter || !this.causticDisplacementFilter) {
        return
      }

      this.animationElapsed += deltaMs
      const config = this.effectConfig

      this.displacementSprite.x = (this.displacementSprite.x + deltaMs * config.flow[0]) % DISPLACEMENT_TEXTURE_SIZE
      this.displacementSprite.y = (this.displacementSprite.y + deltaMs * config.flow[1]) % DISPLACEMENT_TEXTURE_SIZE
      this.displacementFilter.scale.x = config.displacement[0] + Math.sin(this.animationElapsed * 0.0012) * 8
      this.displacementFilter.scale.y = config.displacement[1] + Math.cos(this.animationElapsed * 0.001) * 5
      this.causticDisplacementFilter.scale.x = 16 + Math.cos(this.animationElapsed * 0.0014) * 5
      this.causticDisplacementFilter.scale.y = 9 + Math.sin(this.animationElapsed * 0.0011) * 3
      this.liquidContainer.rotation = Math.sin(this.animationElapsed * 0.00035) * 0.018 * config.rotation
      this.causticContainer.rotation = Math.cos(this.animationElapsed * 0.00042) * 0.012 * config.rotation
      this.causticContainer.alpha = 0.72 + Math.sin(this.animationElapsed * 0.0016) * 0.2
      this.particleGraphics.alpha = 0.68 + Math.cos(this.animationElapsed * 0.0012) * 0.22
    },
    syncTickerState() {
      if (!this.pixiApplication) {
        return
      }

      const shouldRun = this.isComponentActive && !document.hidden && !this.motionQuery?.matches

      if (shouldRun) {
        this.pixiApplication.ticker.start()
      } else {
        this.pixiApplication.ticker.stop()
      }
    },
    handleMotionPreferenceChange(event) {
      if (event.matches) {
        this.destroyPixi()
      } else {
        this.initializePixi()
      }
    },
    handleContextLost(event) {
      event.preventDefault()
      this.destroyPixi()
    },
    destroyPixi() {
      const app = this.pixiApplication

      this.initializationVersion += 1
      this.isReady = false
      this.pixiApplication = null
      this.backgroundGraphics = null
      this.atmosphereGraphics = null
      this.liquidContainer = null
      this.liquidGraphics = null
      this.causticContainer = null
      this.causticGraphics = null
      this.particleGraphics = null
      this.displacementSprite = null
      this.displacementFilter = null
      this.causticDisplacementFilter = null
      this.animationTick = null
      this.animationElapsed = 0

      if (!app) {
        return
      }

      app.canvas?.removeEventListener('webglcontextlost', this.handleContextLost)
      app.destroy(
        { removeView: true },
        { children: true, texture: true, textureSource: true, context: true }
      )
    }
  }
}
</script>

<style scoped>
.liquid-card-backdrop {
  position: absolute;
  z-index: 0;
  inset: 0;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.6s ease;
}

.liquid-card-backdrop.is-ready {
  opacity: 1;
}

.liquid-card-backdrop :deep(.liquid-card-canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .liquid-card-backdrop {
    display: none;
    transition: none;
  }
}
</style>
