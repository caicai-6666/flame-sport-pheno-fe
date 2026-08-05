<template>
  <header class="header-bar">
    <div class="brand-group">
      <button
        v-if="isDetail"
        class="back-button"
        type="button"
        aria-label="返回项目列表"
        @click="$emit('back')"
      >
        ←
      </button>
      <img class="brand-logo" src="../assets/logo.png" alt="pheno" />
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
  emits: ['back']
}
</script>

<style scoped>
.header-bar {
  position: fixed;
  z-index: 10;
  top: 0;
  left: 50%;
  width: min(100vw, 430px);
  min-height: 76px;
  padding: 16px 18px 16px;
  background:
    linear-gradient(
      180deg,
      rgba(248, 251, 245, 0.98) 0%,
      rgba(248, 251, 245, 0.9) 62%,
      rgba(248, 251, 245, 0) 100%
    ),
    rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(14px);
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
