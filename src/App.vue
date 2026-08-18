<template>
  <div class="app-shell">
    <!-- 登录完成前不创建路由页面，避免无会话时并发发起业务接口。 -->
    <template v-if="canRenderApplication">
      <HeaderBar
        :active-title="activeTitle"
        :is-detail="isProjectDetail"
        :is-exiting="isApplicationExiting"
        @back="goBack"
        @exit="exitApplication"
      />

      <main class="page-content">
        <router-view v-slot="{ Component, route }">
          <Transition :name="pageTransitionName">
            <KeepAlive>
              <component
                :is="Component"
                v-if="route.meta.keepAlive"
                :key="route.fullPath"
                class="route-page-frame"
              />
            </KeepAlive>
          </Transition>
          <Transition :name="pageTransitionName">
            <component
              :is="Component"
              v-if="!route.meta.keepAlive"
              :key="route.fullPath"
              class="route-page-frame"
            />
          </Transition>
        </router-view>
      </main>

      <BottomNav
        :items="navItems"
        :active-key="activeNav"
        @change="changeNav"
      />

      <Transition name="exit-notice">
        <p v-if="applicationExitError" class="application-exit-notice" role="alert">
          {{ applicationExitError }}
        </p>
      </Transition>

      <UserHealthProfilePanel
        v-if="shouldCollectHealthProfile"
        :missing-fields="healthProfileMissingFields"
        :is-saving="isHealthProfileSaving"
        :save-error="healthProfileSaveError"
        @submit="handleHealthProfileSubmit"
      />
    </template>

    <section
      v-else
      class="auth-status-panel"
      :class="{ 'is-loading': isLoggingIn }"
      :role="loginError ? 'alert' : 'status'"
      :aria-busy="isLoggingIn"
    >
      <div>
        <strong>{{ loginPanelTitle }}</strong>
        <span>{{ loginPanelMessage }}</span>
      </div>
      <button v-if="loginError" type="button" :disabled="isLoggingIn" @click="retryLogin">
        {{ isLoggingIn ? '登录中' : '重新尝试' }}
      </button>
    </section>

    <span
      v-for="burst in healthProfileConfettiBursts"
      :key="burst.id"
      class="profile-side-confetti"
      :class="`is-${burst.side}`"
      aria-hidden="true"
    >
      <span
        v-for="particle in burst.particles"
        :key="particle.id"
        class="profile-side-confetti-piece"
        :style="{
          '--confetti-origin-y': `${particle.originY}vh`,
          '--confetti-x': `${particle.x}px`,
          '--confetti-y': `${particle.y}px`,
          '--confetti-rotate': `${particle.rotate}deg`,
          '--confetti-color': particle.color,
          '--confetti-size': `${particle.size}px`,
          '--delay': `${particle.delay}ms`
        }"
      ></span>
    </span>

    <Transition name="launch-cover">
      <section
        v-if="shouldShowLaunchCover"
        class="launch-cover"
        aria-hidden="true"
      >
        <!-- 静态位图统一使用 WebP，减少首屏传输量和重复的回退资源。 -->
        <img
          class="launch-cover-image"
          :src="launchCoverSource"
          alt=""
          decoding="sync"
          fetchpriority="high"
          :class="{ 'is-ready': isLaunchCoverImageLoaded }"
          @load="handleLaunchCoverLoaded"
          @error="handleLaunchCoverLoadError"
        >
      </section>
    </Transition>
  </div>
</template>

<script>
import launchCoverSource from './assets/cover.webp'
import HeaderBar from './components/HeaderBar.vue'
import BottomNav from './components/BottomNav.vue'
import UserHealthProfilePanel from './components/UserHealthProfilePanel.vue'
import { closeDingTalkApplication } from './api/dingtalkNavigation'
import { updateUserProfile } from './api/userProfile'
import { getLoginCredentialSource } from './api/loginCredential'
import { findTaskByName } from './state/appState'
import { authState, initLogin } from './state/authState'
import { saveUserHealthProfile, userHealthProfileState } from './state/userHealthProfileState'

const navItems = [
  { key: 'project', label: '项目', icon: '◎', routeName: 'projects' },
  { key: 'rank', label: '排行', icon: '♛', routeName: 'rank' },
  { key: 'history', label: '历史', icon: '◷', routeName: 'history' },
  { key: 'shop', label: '商城', icon: '🛍', routeName: 'shop' }
]
const LAUNCH_COVER_MIN_DURATION = 1000
const EDGE_GESTURE_START_WIDTH = 24
const EDGE_GESTURE_EXIT_DISTANCE = 72
const EDGE_GESTURE_MAX_DURATION = 900

export default {
  name: 'App',
  components: {
    HeaderBar,
    BottomNav,
    UserHealthProfilePanel
  },
  data() {
    return {
      navItems,
      isLaunchCoverImageLoaded: false,
      launchCoverSource,
      isLaunchCoverImageReady: false,
      isLaunchCoverMinimumElapsed: false,
      launchCoverTimer: null,
      isHealthProfileSaving: false,
      healthProfileSaveError: null,
      healthProfileConfettiBursts: [],
      healthProfileConfettiTimers: [],
      pageTransitionName: 'route-crossfade',
      isApplicationExiting: false,
      applicationExitError: '',
      applicationExitErrorTimer: null,
      edgeExitGesture: null,
      edgeGestureTarget: null
    }
  },
  computed: {
    activeNav() {
      return this.$route.meta.navKey || 'project'
    },
    activeTitle() {
      if (this.$route.name === 'project-detail') {
        return findTaskByName(this.$route.params.taskName)?.name || '项目详情'
      }

      return this.$route.meta.title || ''
    },
    isProjectDetail() {
      return this.$route.name === 'project-detail'
    },
    shouldCollectHealthProfile() {
      return userHealthProfileState.shouldCollectProfile
    },
    healthProfileMissingFields() {
      return userHealthProfileState.completion?.missingFields || []
    },
    loginError() {
      return authState.loginError
    },
    loginErrorMessage() {
      return this.loginError?.message || '请在钉钉内打开应用，或检查后端登录接口'
    },
    isLoggingIn() {
      return authState.isLoggingIn
    },
    isLoginReady() {
      return authState.isLoginReady
    },
    canRenderApplication() {
      return this.isLoginReady && !this.loginError
    },
    shouldShowLaunchCover() {
      // 图片完整加载后才开始封面计时，避免用户看到图片逐步绘制或只停留极短时间。
      return !this.isLaunchCoverImageReady || !this.isLaunchCoverMinimumElapsed || !this.isLoginReady
    },
    usesDingTalkLogin() {
      return getLoginCredentialSource() === 'dingtalk'
    },
    loginPanelTitle() {
      if (this.loginError) {
        return '登录未完成'
      }

      if (authState.loginStep === 'requesting_login') {
        return '正在建立登录会话'
      }

      return this.usesDingTalkLogin ? '正在连接钉钉' : '正在读取开发登录凭证'
    },
    loginPanelMessage() {
      if (this.loginError) {
        if (authState.loginStep === 'failed_getting_credential') {
          return `登录失败：${this.loginErrorMessage}。登录凭证尚未获取成功，因此不会发起 /auth/login 请求。`
        }

        return `登录失败：${this.loginErrorMessage}`
      }

      return authState.loginStep === 'requesting_login'
        ? '正在向服务端验证当前身份…'
        : (this.usesDingTalkLogin ? '正在获取钉钉免登授权码…' : '正在读取 VUE_APP_AUTH_CODE…')
    }
  },
  watch: {
    $route(to, from) {
      const toOrder = Number(to.meta.pageOrder)
      const fromOrder = Number(from.meta.pageOrder)

      if (!Number.isFinite(toOrder) || !Number.isFinite(fromOrder) || toOrder === fromOrder) {
        this.pageTransitionName = 'route-crossfade'
        return
      }

      // 页面顺序与底部导航保持一致；进入右侧页面时内容整体左移，反向导航则整体右移。
      this.pageTransitionName = toOrder > fromOrder
        ? 'route-slide-left'
        : 'route-slide-right'
    },
    shouldCollectHealthProfile: {
      immediate: true,
      handler(shouldLock) {
        document.body.classList.toggle('is-profile-panel-open', shouldLock)
      }
    },
    loginError: {
      immediate: true,
      handler(error) {
        document.body.classList.toggle('is-auth-panel-open', Boolean(error))
      }
    }
  },
  mounted() {
    this.edgeGestureTarget = this.$el
    this.edgeGestureTarget.addEventListener('touchstart', this.handleEdgeTouchStart, { passive: true, capture: true })
    this.edgeGestureTarget.addEventListener('touchmove', this.handleEdgeTouchMove, { passive: false, capture: true })
    this.edgeGestureTarget.addEventListener('touchend', this.handleEdgeTouchEnd, { passive: true, capture: true })
    this.edgeGestureTarget.addEventListener('touchcancel', this.resetEdgeExitGesture, { passive: true, capture: true })
  },
  methods: {
    handleLaunchCoverLoaded() {
      this.isLaunchCoverImageLoaded = true
      this.startLaunchCoverTimer()
    },
    handleLaunchCoverLoadError() {
      // 图片异常时不能永久遮挡应用，退化为同色背景后继续既有启动流程。
      this.startLaunchCoverTimer()
    },
    startLaunchCoverTimer() {
      if (this.isLaunchCoverImageReady) {
        return
      }

      this.isLaunchCoverImageReady = true
      this.launchCoverTimer = window.setTimeout(() => {
        this.isLaunchCoverMinimumElapsed = true
        this.launchCoverTimer = null
      }, LAUNCH_COVER_MIN_DURATION)
    },
    changeNav(key) {
      const item = this.navItems.find(navItem => navItem.key === key)

      if (!item || item.routeName === this.$route.name) {
        return
      }

      this.$router.replace({ name: item.routeName })
    },
    goBack() {
      this.$router.replace({ name: 'projects' })
    },
    async exitApplication() {
      if (this.isApplicationExiting) {
        return
      }

      this.isApplicationExiting = true
      this.applicationExitError = ''
      window.clearTimeout(this.applicationExitErrorTimer)

      try {
        await closeDingTalkApplication()
      } catch (error) {
        this.applicationExitError = error?.message || '退出失败，请稍后重试'
        this.applicationExitErrorTimer = window.setTimeout(() => {
          this.applicationExitError = ''
          this.applicationExitErrorTimer = null
        }, 3200)
      } finally {
        this.isApplicationExiting = false
      }
    },
    handleEdgeTouchStart(event) {
      if (!this.canRenderApplication || event.touches.length !== 1) {
        this.resetEdgeExitGesture()
        return
      }

      const touch = event.touches[0]
      const appBounds = this.$el.getBoundingClientRect()
      const relativeX = touch.clientX - appBounds.left
      const startsAtLeftEdge = relativeX >= 0 && relativeX <= EDGE_GESTURE_START_WIDTH
      const startsAtRightEdge = relativeX <= appBounds.width && relativeX >= appBounds.width - EDGE_GESTURE_START_WIDTH

      if (!startsAtLeftEdge && !startsAtRightEdge) {
        this.resetEdgeExitGesture()
        return
      }

      this.edgeExitGesture = {
        side: startsAtLeftEdge ? 'left' : 'right',
        startX: touch.clientX,
        startY: touch.clientY,
        startedAt: Date.now(),
        isHorizontal: false
      }
    },
    handleEdgeTouchMove(event) {
      const gesture = this.edgeExitGesture

      if (!gesture || event.touches.length !== 1) {
        return
      }

      const touch = event.touches[0]
      const deltaX = touch.clientX - gesture.startX
      const deltaY = touch.clientY - gesture.startY
      const inwardDistance = gesture.side === 'left' ? deltaX : -deltaX

      if (Math.abs(deltaY) > 12 && Math.abs(deltaY) > Math.abs(deltaX)) {
        this.resetEdgeExitGesture()
        return
      }

      if (inwardDistance > 8 && inwardDistance > Math.abs(deltaY) * 1.2) {
        // 边缘返回手势一旦被识别就阻止 WebView 接管，避免先退回上一条前端路由。
        gesture.isHorizontal = true
        event.preventDefault()
      }
    },
    handleEdgeTouchEnd(event) {
      const gesture = this.edgeExitGesture
      const touch = event.changedTouches[0]
      this.resetEdgeExitGesture()

      if (!gesture?.isHorizontal || !touch) {
        return
      }

      const deltaX = touch.clientX - gesture.startX
      const deltaY = touch.clientY - gesture.startY
      const inwardDistance = gesture.side === 'left' ? deltaX : -deltaX
      const gestureDuration = Date.now() - gesture.startedAt

      if (
        inwardDistance >= EDGE_GESTURE_EXIT_DISTANCE &&
        Math.abs(deltaY) <= inwardDistance * 0.72 &&
        gestureDuration <= EDGE_GESTURE_MAX_DURATION
      ) {
        this.exitApplication()
      }
    },
    resetEdgeExitGesture() {
      this.edgeExitGesture = null
    },
    retryLogin() {
      initLogin()
    },
    async handleHealthProfileSubmit(profile) {
      if (this.isHealthProfileSaving) {
        return
      }

      this.isHealthProfileSaving = true
      this.healthProfileSaveError = null
      const savingStartedAt = Date.now()

      try {
        await updateUserProfile(profile)
        await this.waitForMinHealthProfileSavingDuration(savingStartedAt)
        this.launchHealthProfileConfetti()
        saveUserHealthProfile(profile)
      } catch (error) {
        await this.waitForMinHealthProfileSavingDuration(savingStartedAt)
        this.healthProfileSaveError = error
      } finally {
        this.isHealthProfileSaving = false
      }
    },
    async waitForMinHealthProfileSavingDuration(startedAt) {
      const minDuration = 900
      const elapsed = Date.now() - startedAt
      const remaining = minDuration - elapsed

      if (remaining > 0) {
        await new Promise(resolve => window.setTimeout(resolve, remaining))
      }
    },
    launchHealthProfileConfetti() {
      const colors = ['#ffffff', '#baf19d', '#72d84f', '#20c7b5', '#ffd166', '#ff9f45', '#ff7ed2']
      const sides = [
        {
          name: 'left',
          direction: 1
        },
        {
          name: 'right',
          direction: -1
        }
      ]
      const bursts = sides.map(side => ({
        id: `${side.name}-${Date.now()}`,
        side: side.name,
        particles: Array.from({ length: 58 }, (_, index) => ({
          id: index,
          originY: Math.round(Math.random() * 40),
          x: side.direction * Math.round(68 + Math.random() * 280),
          y: Math.round(-150 - Math.random() * 360),
          rotate: Math.round(Math.random() * 720 - 180),
          color: colors[index % colors.length],
          size: Math.round(4 + Math.random() * 8),
          delay: Math.round(Math.random() * 150)
        }))
      }))

      this.healthProfileConfettiBursts = [...this.healthProfileConfettiBursts, ...bursts]

      const timer = window.setTimeout(() => {
        const burstIds = bursts.map(burst => burst.id)
        this.healthProfileConfettiBursts = this.healthProfileConfettiBursts.filter(burst => !burstIds.includes(burst.id))
        this.healthProfileConfettiTimers = this.healthProfileConfettiTimers.filter(item => item !== timer)
      }, 1500)

      this.healthProfileConfettiTimers = [...this.healthProfileConfettiTimers, timer]
    }
  },
  beforeUnmount() {
    document.body.classList.remove('is-profile-panel-open')
    document.body.classList.remove('is-auth-panel-open')
    this.edgeGestureTarget?.removeEventListener('touchstart', this.handleEdgeTouchStart, true)
    this.edgeGestureTarget?.removeEventListener('touchmove', this.handleEdgeTouchMove, true)
    this.edgeGestureTarget?.removeEventListener('touchend', this.handleEdgeTouchEnd, true)
    this.edgeGestureTarget?.removeEventListener('touchcancel', this.resetEdgeExitGesture, true)
    window.clearTimeout(this.launchCoverTimer)
    window.clearTimeout(this.applicationExitErrorTimer)
    this.healthProfileConfettiTimers.forEach(timer => window.clearTimeout(timer))
  }
}
</script>

<style>
:root {
  --header-height: 64px;
  --ink: #17211b;
  --muted: #718078;
  --line: rgba(23, 33, 27, 0.1);
  --green: #72d84f;
  --green-dark: #2f8f32;
  --surface: rgba(255, 255, 255, 0.84);
}

* {
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  overscroll-behavior: none;
}

html {
  background: #f8fbf5;
}

body {
  min-width: 320px;
  margin: 0;
  background:
    radial-gradient(circle at 18% 8%, rgba(114, 216, 79, 0.26), transparent 28%),
    radial-gradient(circle at 90% 18%, rgba(32, 199, 181, 0.18), transparent 26%),
    linear-gradient(145deg, #eef7ed 0%, #f7f4ed 52%, #eef6f1 100%);
  color: var(--ink);
}

body.is-profile-panel-open {
  overflow: hidden;
}

body.is-auth-panel-open {
  overflow: hidden;
}

button {
  font: inherit;
  -webkit-tap-highlight-color: transparent;
}

#app {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.app-shell {
  position: relative;
  width: min(100vw, 430px);
  height: 100vh;
  height: 100dvh;
  min-height: 0;
  margin: 0 auto;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.72)),
    #f8fbf5;
  box-shadow: 0 24px 70px rgba(32, 58, 41, 0.16);
  display: flex;
  flex-direction: column;
}

.app-shell::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background:
    radial-gradient(circle at 78% 16%, rgba(114, 216, 79, 0.18), transparent 22%),
    radial-gradient(circle at 8% 46%, rgba(255, 159, 69, 0.1), transparent 24%);
}

.page-content {
  position: relative;
  z-index: 1;
  overflow: hidden;
  flex: 1;
  min-height: 0;
  padding: var(--header-height) 0 0;
  padding:
    calc(var(--header-height) + env(safe-area-inset-top))
    0
    0;
  overscroll-behavior: none;
  display: grid;
  align-items: start;
}

.route-page-frame {
  grid-area: 1 / 1;
  overflow-x: hidden;
  overflow-y: auto;
  min-width: 0;
  width: 100%;
  height: 100%;
  padding: 16px 18px calc(92px + max(4px, env(safe-area-inset-bottom)));
  overscroll-behavior: none;
  -webkit-overflow-scrolling: touch;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

/* 固定高度页面把避让空间放进自己的滚动列表，底部玻璃栏才能真正悬浮在内容上方。 */
.route-page-frame.rank-page,
.route-page-frame.history-page,
.route-page-frame.past-season-page {
  padding-bottom: 0;
}

.application-exit-notice {
  position: fixed;
  z-index: 24;
  top: calc(70px + env(safe-area-inset-top));
  left: 50%;
  max-width: min(calc(100vw - 44px), 360px);
  margin: 0;
  padding: 10px 14px;
  border: 1px solid rgba(123, 67, 42, 0.12);
  border-radius: 16px;
  background: rgba(255, 248, 239, 0.94);
  color: #78401f;
  box-shadow: 0 10px 26px rgba(66, 36, 20, 0.16);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.5;
  text-align: center;
  transform: translateX(-50%);
}

.exit-notice-enter-active,
.exit-notice-leave-active {
  transition: opacity 220ms ease, transform 260ms cubic-bezier(0.2, 0.82, 0.2, 1);
}

.exit-notice-enter-from,
.exit-notice-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px) scale(0.96);
}

.route-slide-left-enter-active,
.route-slide-left-leave-active,
.route-slide-right-enter-active,
.route-slide-right-leave-active {
  transition:
    opacity 0.38s ease,
    transform 0.44s cubic-bezier(0.2, 0.82, 0.2, 1);
  will-change: opacity, transform;
}

.route-slide-left-enter-active,
.route-slide-right-enter-active {
  position: relative;
  z-index: 2;
}

.route-slide-left-leave-active,
.route-slide-right-leave-active {
  position: relative;
  z-index: 1;
  pointer-events: none;
}

.route-slide-left-enter-from {
  opacity: 0.36;
  transform: translate3d(104%, 0, 0);
}

.route-slide-left-leave-to {
  opacity: 0.18;
  transform: translate3d(-104%, 0, 0);
}

.route-slide-right-enter-from {
  opacity: 0.36;
  transform: translate3d(-104%, 0, 0);
}

.route-slide-right-leave-to {
  opacity: 0.18;
  transform: translate3d(104%, 0, 0);
}

.route-crossfade-enter-active,
.route-crossfade-leave-active {
  transition: opacity 0.22s ease;
}

.route-crossfade-leave-active {
  pointer-events: none;
}

.route-crossfade-enter-from,
.route-crossfade-leave-to {
  opacity: 0;
}

.auth-status-panel {
  position: fixed;
  z-index: 30;
  inset: 0;
  width: min(100vw, 430px);
  margin: 0 auto;
  padding: 28px;
  background: rgba(248, 251, 245, 0.88);
  backdrop-filter: blur(16px);
  display: grid;
  place-items: center;
  gap: 18px;
  align-content: center;
  text-align: center;
}

.auth-status-panel div {
  max-width: 300px;
}

.auth-status-panel strong,
.auth-status-panel span {
  display: block;
}

.auth-status-panel strong {
  color: #17211b;
  font-size: 22px;
  font-weight: 950;
}

.auth-status-panel span {
  margin-top: 8px;
  color: #68766d;
  font-size: 13px;
  font-weight: 760;
  line-height: 1.6;
}

.auth-status-panel button {
  min-width: 92px;
  min-height: 40px;
  border: 0;
  border-radius: 999px;
  background: #17211b;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  font-weight: 900;
}

.auth-status-panel button:disabled {
  opacity: 0.58;
  cursor: wait;
}

.launch-cover {
  position: fixed;
  z-index: 100;
  inset: 0;
  width: min(100vw, 430px);
  height: 100vh;
  height: 100dvh;
  margin: auto;
  overflow: hidden;
  background:
    radial-gradient(circle at 85% 11%, rgba(166, 239, 72, 0.48), transparent 28%),
    linear-gradient(145deg, #f8f8f2, #eef4e7);
}

.launch-cover-image {
  width: 100%;
  height: 100%;
  display: block;
}

.launch-cover-image {
  object-fit: cover;
  object-position: center;
  visibility: hidden;
}

.launch-cover-image.is-ready {
  visibility: visible;
}

.launch-cover-leave-active {
  transition:
    opacity 460ms ease,
    transform 460ms ease;
}

.launch-cover-leave-to {
  opacity: 0;
  transform: scale(1.012);
}

/* 超长屏若继续 cover 会裁掉封面两侧的主标题或 Logo，优先完整呈现核心品牌信息。 */
@media (max-aspect-ratio: 9 / 17) {
  .launch-cover-image {
    object-fit: contain;
    /* 完整展示在超长屏会留下上下留白，用遮罩将封面边缘自然融入同色背景。 */
    -webkit-mask-image: linear-gradient(to bottom, transparent 8%, #000 13%, #000 80%, rgba(0, 0, 0, 0.45) 87%, transparent 96%);
    mask-image: linear-gradient(to bottom, transparent 8%, #000 13%, #000 80%, rgba(0, 0, 0, 0.45) 87%, transparent 96%);
  }
}

.module-page {
  min-height: 420px;
  margin-top: 18px;
  padding: 28px 22px;
  border: 1px solid var(--line);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 18px 45px rgba(41, 64, 48, 0.08);
}

.module-eyebrow {
  color: var(--green-dark);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.module-page h1 {
  margin: 10px 0 10px;
  font-size: 28px;
  line-height: 1.1;
}

.module-page p {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.8;
}

.profile-side-confetti {
  position: fixed;
  z-index: 70;
  bottom: -18px;
  width: 1px;
  height: 1px;
  pointer-events: none;
}

.profile-side-confetti.is-left {
  left: -18px;
}

.profile-side-confetti.is-right {
  right: -18px;
}

.profile-side-confetti-piece {
  position: absolute;
  bottom: 0;
  left: 0;
  width: var(--confetti-size);
  height: calc(var(--confetti-size) * 0.62);
  border-radius: 999px;
  background: var(--confetti-color);
  box-shadow: 0 0 10px color-mix(in srgb, var(--confetti-color), transparent 45%);
  opacity: 0;
  transform: translate(-50%, calc(var(--confetti-origin-y) * -1)) scale(0.42) rotate(0deg);
  animation: profile-side-confetti-pop 1280ms cubic-bezier(0.16, 0.9, 0.28, 1) forwards;
  animation-delay: var(--delay);
}

.profile-side-confetti-piece:nth-child(3n) {
  border-radius: 2px;
}

.profile-side-confetti-piece:nth-child(4n) {
  width: calc(var(--confetti-size) * 0.62);
  height: calc(var(--confetti-size) * 0.62);
}

@keyframes profile-side-confetti-pop {
  0% {
    opacity: 0;
    transform: translate(-50%, calc(var(--confetti-origin-y) * -1)) scale(0.36) rotate(0deg);
  }

  12% {
    opacity: 1;
  }

  70% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform:
      translate(calc(-50% + var(--confetti-x)), calc((var(--confetti-origin-y) * -1) + var(--confetti-y)))
      scale(0.86)
      rotate(var(--confetti-rotate));
  }
}

@media (prefers-reduced-motion: reduce) {
  .route-slide-left-enter-active,
  .route-slide-left-leave-active,
  .route-slide-right-enter-active,
  .route-slide-right-leave-active,
  .route-crossfade-enter-active,
  .route-crossfade-leave-active {
    transition-duration: 1ms;
  }

  .exit-notice-enter-active,
  .exit-notice-leave-active {
    transition-duration: 1ms;
  }

  .route-slide-left-enter-from,
  .route-slide-left-leave-to,
  .route-slide-right-enter-from,
  .route-slide-right-leave-to {
    transform: none;
  }

  .launch-cover-leave-active {
    transition-duration: 1ms;
  }
}

/*
 * 部分 Android 钉钉仍使用不支持 color-mix() 的 Chromium WebView。
 * 这类浏览器会丢弃包含未知颜色函数的整条 background 声明，半透明面板便会露出底层内容。
 * 仅在特性缺失时使用实色回退，避免影响支持现代 CSS 的设备。
 */
@supports not (color: color-mix(in srgb, #000, #fff)) {
  .app-shell {
    background: #f8fbf5;
  }

  .app-shell .header-bar,
  .app-shell .bottom-nav {
    background: #f8fbf5;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  .auth-status-panel {
    background: #f8fbf5;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .app-shell .upload-overlay {
    background: rgba(18, 27, 21, 0.56);
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  .app-shell .upload-overlay .upload-panel {
    background: #f7fbf4;
  }

  .app-shell .upload-panel .upload-kicker {
    color: var(--accent, #2f8f32);
  }

  .app-shell .upload-panel .upload-daily-hint {
    border-color: rgba(47, 143, 50, 0.22);
    background: #edf8e8;
  }

  .app-shell .upload-panel .upload-daily-hint span,
  .app-shell .upload-panel .upload-icon {
    background: var(--accent, #49b84b);
  }

  .app-shell .upload-panel .upload-dropzone {
    border-color: var(--accent, #49b84b);
    background: #f4fbf0;
  }

  .app-shell .upload-panel .record-type-toggle button.is-active {
    border-color: var(--accent, #49b84b);
    background: #edf8e8;
  }

  .app-shell .upload-panel .submit-proof {
    background: linear-gradient(135deg, var(--accent, #49b84b), #2f8f32);
  }

  .app-shell .project-detail .detail-hero {
    background: linear-gradient(135deg, #17211b, #263d2a);
  }

  .app-shell .project-detail .lock-button.is-locked,
  .app-shell .project-detail .challenge-level-badge {
    background: var(--accent, #49b84b);
  }

  .app-shell .project-detail .challenge-card.is-selected-level {
    border-color: var(--accent, #49b84b);
    background: linear-gradient(180deg, #edf8e8, #fff);
    box-shadow: 0 16px 32px rgba(47, 143, 50, 0.18);
  }

  .app-shell .project-detail .level-dot {
    box-shadow: 0 0 0 7px rgba(47, 143, 50, 0.22);
  }

  .app-shell .project-detail .lock-note {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  .app-shell .task-card.is-locked {
    border-color: var(--accent, #49b84b);
    background:
      linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(224, 231, 229, 0.9) 40%, rgba(255, 255, 255, 0.92)),
      #f7f9f8;
    box-shadow: 0 18px 42px rgba(38, 64, 45, 0.14);
  }

  .app-shell .task-card.is-locked::after {
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.86) 46%, rgba(186, 241, 157, 0.72) 56%, transparent);
    mix-blend-mode: normal;
  }

  .app-shell .task-card .locked-badge {
    background: linear-gradient(135deg, #fff, #dfe9db);
    color: var(--accent, #2f8f32);
  }

  .app-shell .task-card .task-description.is-challenge-requirement,
  .app-shell .task-card .task-link {
    color: var(--accent, #2f8f32);
  }

  .app-shell .goal-progress-track span {
    background: var(--accent, #49b84b);
  }

  .app-shell .history-card::before {
    background: rgba(47, 143, 50, 0.38);
  }

  .app-shell .history-card .record-date {
    background: #edf8e8;
    color: var(--accent, #2f8f32);
  }

  .app-shell .reward-visual {
    background: linear-gradient(135deg, #ecf8e7, #fff);
  }

  .app-shell .reward-image-skeleton {
    background: rgba(239, 248, 235, 0.94);
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.7),
      inset 0 16px 30px rgba(255, 255, 255, 0.42);
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  .app-shell .reward-image-skeleton::before {
    background:
      linear-gradient(115deg, transparent 14%, rgba(255, 255, 255, 0.5) 28%, transparent 43%, rgba(255, 255, 255, 0.3) 58%, transparent 74%),
      radial-gradient(circle at 24% 32%, rgba(255, 255, 255, 0.46), transparent 30%);
  }

  .app-shell .reward-visual span {
    color: var(--reward-accent, #2f8f32);
  }
}
</style>
