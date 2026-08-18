<template>
  <header class="header-bar">
    <div class="brand-group">
      <button
        class="exit-button"
        :class="{ 'is-exiting': isExiting }"
        type="button"
        :disabled="isExiting"
        :aria-label="isExiting ? '正在退出应用' : '退出应用'"
        title="退出应用"
        @click="$emit('exit')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2.75v8.5" />
          <path d="M7.4 5.85a8 8 0 1 0 9.2 0" />
        </svg>
      </button>
      <button
        v-if="isDetail"
        class="back-button"
        type="button"
        aria-label="返回项目列表"
        @click="$emit('back')"
      >
        ←
      </button>
      <img class="brand-logo" src="../assets/logo.webp" alt="pheno" />
    </div>

    <div class="header-meta">
      <button class="avatar-button" type="button" aria-label="头像">
        <img v-if="avatarUrl" :src="avatarUrl" :alt="avatarAlt">
        <span v-else>{{ avatarInitials }}</span>
      </button>
    </div>
  </header>
</template>

<script>
import { getAvatarImage } from '../api/avatar'
import { authState } from '../state/authState'

export default {
  name: 'HeaderBar',
  data() {
    return {
      avatarUrl: '',
      avatarObjectUrl: ''
    }
  },
  props: {
    activeTitle: {
      type: String,
      required: true
    },
    isDetail: {
      type: Boolean,
      default: false
    },
    isExiting: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    authCode() {
      return authState.authCode
    },
    currentUser() {
      return authState.currentUser
    },
    avatarAlt() {
      return this.currentUser?.name ? `${this.currentUser.name}头像` : '用户头像'
    },
    avatarInitials() {
      const name = this.currentUser?.name?.trim()

      if (!name) {
        return 'PH'
      }

      return name.slice(0, 2).toUpperCase()
    }
  },
  watch: {
    authCode: {
      immediate: true,
      handler(authCode) {
        if (authCode) {
          this.loadAvatar()
        }
      }
    }
  },
  methods: {
    async loadAvatar() {
      try {
        const avatarBlob = await getAvatarImage()

        if (this.avatarObjectUrl) {
          URL.revokeObjectURL(this.avatarObjectUrl)
        }

        this.avatarObjectUrl = URL.createObjectURL(avatarBlob)
        this.avatarUrl = this.avatarObjectUrl
      } catch (error) {
        this.avatarUrl = ''
      }
    }
  },
  beforeUnmount() {
    if (this.avatarObjectUrl) {
      URL.revokeObjectURL(this.avatarObjectUrl)
    }
  },
  emits: ['back', 'exit']
}
</script>

<style scoped>
.header-bar {
  position: fixed;
  z-index: 10;
  top: 0;
  left: 50%;
  width: min(100vw, 430px);
  min-height: var(--header-height);
  min-height: calc(var(--header-height) + env(safe-area-inset-top));
  padding: 8px 18px 12px;
  padding: calc(8px + env(safe-area-inset-top)) 18px 12px;
  background:
    linear-gradient(
      180deg,
      rgba(248, 251, 245, 0.98) 0%,
      rgba(248, 251, 245, 0.96) 100%
    ),
    #f8fbf5;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  pointer-events: none;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  transform: translateX(-50%);
}

.brand-group {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  pointer-events: auto;
}

.exit-button {
  position: relative;
  overflow: hidden;
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  border: 1px solid rgba(41, 94, 55, 0.14);
  border-radius: 16px;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(205, 239, 209, 0.66)),
    rgba(234, 246, 235, 0.88);
  color: #236b38;
  box-shadow:
    0 8px 18px rgba(34, 85, 47, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition:
    color 180ms ease,
    transform 180ms ease,
    box-shadow 180ms ease;
}

.exit-button::before {
  position: absolute;
  inset: -60% 36% -60% -48%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.74), transparent);
  content: '';
  transform: rotate(18deg);
}

.exit-button svg {
  position: relative;
  z-index: 1;
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2.1;
}

.exit-button:active {
  transform: scale(0.94);
}

.exit-button:focus-visible {
  outline: 3px solid rgba(114, 216, 79, 0.32);
  outline-offset: 2px;
}

.exit-button.is-exiting {
  color: #163d23;
  cursor: wait;
  box-shadow:
    0 4px 12px rgba(34, 85, 47, 0.11),
    inset 0 0 0 8px rgba(114, 216, 79, 0.1);
}

.exit-button.is-exiting svg {
  animation: exit-button-pulse 720ms ease-in-out infinite alternate;
}

@keyframes exit-button-pulse {
  to {
    opacity: 0.52;
    transform: scale(0.88);
  }
}

@media (prefers-reduced-motion: reduce) {
  .exit-button,
  .exit-button.is-exiting svg {
    animation: none;
    transition: none;
  }
}

.back-button {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
  color: #223024;
  box-shadow: 0 8px 20px rgba(35, 55, 39, 0.1);
  cursor: pointer;
  font-size: 19px;
  line-height: 1;
}

.brand-logo {
  width: 38px;
  height: auto;
  background: transparent;
  display: block;
  filter: drop-shadow(0 8px 14px rgba(45, 61, 49, 0.1));
}

.header-meta {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-width: 0;
  pointer-events: auto;
}

.current-title {
  max-width: 88px;
  overflow: hidden;
  color: rgba(23, 33, 27, 0.66);
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.avatar-button {
  position: relative;
  overflow: hidden;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 50%;
  background:
    linear-gradient(135deg, rgba(114, 216, 79, 0.24), rgba(255, 255, 255, 0.92)),
    #fff;
  color: #1b2a1f;
  box-shadow: 0 14px 28px rgba(38, 67, 43, 0.13);
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
}

.avatar-button img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-button span {
  position: relative;
  z-index: 1;
}

.avatar-button::after {
  position: absolute;
  right: 4px;
  bottom: 5px;
  width: 11px;
  height: 11px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #72d84f;
  content: '';
}
</style>
