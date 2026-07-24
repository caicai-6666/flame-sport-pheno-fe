<template>
  <div class="app-shell">
    <!-- 登录完成前不创建路由页面，避免无会话时并发发起业务接口。 -->
    <template v-if="canRenderApplication">
      <HeaderBar
        :active-title="activeTitle"
        :is-detail="isProjectDetail"
        @back="goBack"
      />

      <main class="page-content">
        <router-view v-slot="{ Component, route }">
          <KeepAlive>
            <component
              :is="Component"
              v-if="route.meta.keepAlive"
              :key="route.fullPath"
            />
          </KeepAlive>
          <component
            :is="Component"
            v-if="!route.meta.keepAlive"
          />
        </router-view>
      </main>

      <BottomNav
        :items="navItems"
        :active-key="activeNav"
        @change="changeNav"
      />

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
        <span class="launch-cover-aura launch-cover-aura-primary"></span>
        <span class="launch-cover-aura launch-cover-aura-secondary"></span>
        <span class="launch-cover-grain"></span>

        <div
          class="launch-cover-content"
          :class="{
            'is-ready': isLaunchCoverReady,
            'uses-font-fallback': isLaunchCoverFontFallback
          }"
        >
          <div class="launch-cover-logo-frame">
            <img class="launch-cover-logo" :src="launchLogoSource" alt="">
          </div>
          <span class="launch-cover-brand">燃动现象</span>
          <h1 class="launch-cover-slogan">
            <span>让运动成为一种习惯</span>
            <span>让挑战成为一种乐趣</span>
          </h1>
        </div>
      </section>
    </Transition>
  </div>
</template>

<script>
import launchLogoSource from './assets/logo.png'
import HeaderBar from './components/HeaderBar.vue'
import BottomNav from './components/BottomNav.vue'
import UserHealthProfilePanel from './components/UserHealthProfilePanel.vue'
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
const LAUNCH_COVER_MIN_DURATION = 1500
const LAUNCH_COVER_FONT_TIMEOUT = 2000
const LAUNCH_COVER_FONT_FAMILY = 'Flame Launch Slogan'

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
      launchLogoSource,
      isLaunchCoverReady: false,
      isLaunchCoverFontFallback: false,
      isLaunchCoverMinimumElapsed: false,
      launchCoverTimer: null,
      launchCoverFontTimer: null,
      isHealthProfileSaving: false,
      healthProfileSaveError: null,
      healthProfileConfettiBursts: [],
      healthProfileConfettiTimers: []
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
      // 标语字体就绪后才开始封面计时，避免先以系统字体显示、再突然替换为艺术字。
      return !this.isLaunchCoverReady || !this.isLaunchCoverMinimumElapsed || !this.isLoginReady
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
    this.prepareLaunchCover()
  },
  methods: {
    async prepareLaunchCover() {
      const isFontLoaded = await this.waitForLaunchCoverFont()

      // 极端弱网下不让封面永久停留；超时后固定使用系统衬线字体，不会在稍后发生字体跳变。
      this.isLaunchCoverFontFallback = !isFontLoaded
      this.isLaunchCoverReady = true
      this.startLaunchCoverTimer()
    },
    waitForLaunchCoverFont() {
      if (!document.fonts?.load) {
        return Promise.resolve(false)
      }

      return new Promise(resolve => {
        let isSettled = false
        const settle = isLoaded => {
          if (isSettled) {
            return
          }

          isSettled = true
          window.clearTimeout(this.launchCoverFontTimer)
          this.launchCoverFontTimer = null
          resolve(isLoaded)
        }

        this.launchCoverFontTimer = window.setTimeout(() => settle(false), LAUNCH_COVER_FONT_TIMEOUT)
        document.fonts
          .load(`400 1em "${LAUNCH_COVER_FONT_FAMILY}"`, '让运动成为一种习惯，让挑战成为一种乐趣')
          .then(() => settle(true))
          .catch(() => settle(false))
      })
    },
    startLaunchCoverTimer() {
      if (this.launchCoverTimer) {
        return
      }

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

      this.$router.push({ name: item.routeName })
    },
    goBack() {
      this.$router.push({ name: 'projects' })
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
    window.clearTimeout(this.launchCoverTimer)
    window.clearTimeout(this.launchCoverFontTimer)
    this.healthProfileConfettiTimers.forEach(timer => window.clearTimeout(timer))
  }
}
</script>

<style>
:root {
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
  min-height: 100vh;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.app-shell {
  position: relative;
  width: min(100vw, 430px);
  min-height: 100vh;
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
  flex: 1;
  min-height: 0;
  padding: 92px 18px 96px;
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

@font-face {
  font-family: 'Flame Launch Slogan';
  src: url('./assets/fonts/LXGWWenKai-Launch.woff2') format('woff2');
  font-display: block;
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
    radial-gradient(circle at 86% 14%, rgba(255, 117, 176, 0.66), transparent 36%),
    radial-gradient(circle at 8% 88%, rgba(113, 202, 255, 0.42), transparent 42%),
    linear-gradient(142deg, #f1ebff 0%, #e6f4ff 47%, #fff0f6 100%);
  background-size: 155% 155%;
  animation: launch-cover-base-flow 8s ease-in-out -1.6s infinite alternate;
}

.launch-cover-aura,
.launch-cover-grain {
  position: absolute;
  pointer-events: none;
}

.launch-cover-aura {
  inset: -34%;
  border-radius: 42%;
  filter: blur(44px);
  opacity: 0.64;
  will-change: transform;
}

.launch-cover-aura-primary {
  background:
    radial-gradient(circle at 30% 35%, rgba(99, 183, 255, 0.4), transparent 24%),
    radial-gradient(circle at 68% 57%, rgba(166, 132, 242, 0.3), transparent 31%),
    radial-gradient(circle at 50% 84%, rgba(255, 126, 178, 0.54), transparent 31%);
  animation: launch-cover-drift-primary 8s linear -1.8s infinite alternate;
}

.launch-cover-aura-secondary {
  background:
    radial-gradient(circle at 74% 25%, rgba(255, 137, 184, 0.72), transparent 26%),
    radial-gradient(circle at 24% 65%, rgba(94, 185, 247, 0.32), transparent 29%);
  opacity: 0.54;
  animation: launch-cover-drift-secondary 10s linear -3.6s infinite alternate;
}

.launch-cover-grain {
  inset: 0;
  opacity: 0.08;
  background-image:
    repeating-radial-gradient(circle at 0 0, rgba(255, 255, 255, 0.22) 0 1px, transparent 1px 4px),
    linear-gradient(110deg, transparent 15%, rgba(229, 220, 255, 0.15) 46%, transparent 75%);
  mix-blend-mode: multiply;
}

.launch-cover-content {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 100%;
  flex-direction: column;
  align-items: center;
  padding: 56px 26px;
  padding: max(56px, env(safe-area-inset-top)) 26px max(56px, env(safe-area-inset-bottom));
  color: #24263d;
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 560ms ease, transform 760ms cubic-bezier(0.22, 0.88, 0.28, 1);
}

.launch-cover-content.is-ready {
  opacity: 1;
  transform: translateY(0);
}

.launch-cover-logo-frame {
  width: 58px;
  height: 58px;
  overflow: hidden;
  border-radius: 18px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.2);
}

.launch-cover-logo {
  display: block;
  width: 122%;
  height: 122%;
  max-width: none;
  transform: translate(-9%, -9%);
}

.launch-cover-brand {
  margin-top: 15px;
  color: rgba(47, 47, 79, 0.7);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.32em;
  text-indent: 0.32em;
}

.launch-cover-slogan {
  display: grid;
  gap: 10px;
  width: 100%;
  margin: auto 0;
  color: transparent;
  font-family: 'Flame Launch Slogan', 'STKaiti', 'KaiTi', 'Noto Serif SC', serif;
  font-size: clamp(24px, 8vw, 36px);
  font-weight: 400;
  letter-spacing: 0.03em;
  line-height: 1.26;
  text-align: center;
  text-shadow: 0 8px 26px rgba(111, 105, 158, 0.16);
}

.launch-cover-content.uses-font-fallback .launch-cover-slogan {
  font-family: 'STKaiti', 'KaiTi', 'Noto Serif SC', serif;
  font-weight: 600;
}

.launch-cover-slogan span {
  display: block;
  white-space: nowrap;
  background: linear-gradient(112deg, #252743 8%, #4a3c67 52%, #2f5d83 105%);
  -webkit-background-clip: text;
  background-clip: text;
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

@keyframes launch-cover-drift-primary {
  from {
    transform: translate3d(-13%, -10%, 0) rotate(-8deg) scale(0.94);
  }

  to {
    transform: translate3d(15%, 14%, 0) rotate(10deg) scale(1.14);
  }
}

@keyframes launch-cover-drift-secondary {
  from {
    transform: translate3d(13%, 12%, 0) rotate(14deg) scale(1.06);
  }

  to {
    transform: translate3d(-15%, -12%, 0) rotate(-10deg) scale(0.88);
  }
}

@keyframes launch-cover-base-flow {
  from {
    background-position: 0% 8%;
  }

  to {
    background-position: 100% 92%;
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
  .launch-cover-leave-active {
    transition-duration: 1ms;
  }

  .launch-cover-content {
    transition-duration: 1ms;
  }

  .launch-cover,
  .launch-cover-aura {
    animation: none;
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
