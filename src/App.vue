<template>
  <div class="app-shell">
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

    <div v-if="loginError" class="auth-status-panel" role="alert">
      <div>
        <strong>登录失败</strong>
        <span>{{ loginErrorMessage }}</span>
      </div>
      <button type="button" :disabled="isLoggingIn" @click="retryLogin">
        {{ isLoggingIn ? '登录中' : '重试' }}
      </button>
    </div>

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
  </div>
</template>

<script>
import HeaderBar from './components/HeaderBar.vue'
import BottomNav from './components/BottomNav.vue'
import UserHealthProfilePanel from './components/UserHealthProfilePanel.vue'
import { updateUserProfile } from './api/userProfile'
import { findTaskByName } from './state/appState'
import { authState, initLogin } from './state/authState'
import { saveUserHealthProfile, userHealthProfileState } from './state/userHealthProfileState'

const navItems = [
  { key: 'project', label: '项目', icon: '◎', routeName: 'projects' },
  { key: 'rank', label: '排行', icon: '♛', routeName: 'rank' },
  { key: 'history', label: '历史', icon: '◷', routeName: 'history' },
  { key: 'shop', label: '商城', icon: '🛍', routeName: 'shop' }
]

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
  methods: {
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
</style>
