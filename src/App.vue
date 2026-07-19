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
  </div>
</template>

<script>
import HeaderBar from './components/HeaderBar.vue'
import BottomNav from './components/BottomNav.vue'
import { findTaskByName } from './state/appState'

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
    BottomNav
  },
  data() {
    return {
      navItems
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
    }
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
</style>
