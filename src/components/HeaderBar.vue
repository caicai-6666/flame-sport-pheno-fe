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
        <span>CA</span>
      </button>
    </div>
  </header>
</template>

<script>
export default {
  name: 'HeaderBar',
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
  min-height: 92px;
  padding: 24px 20px 22px;
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
  width: 34px;
  height: 34px;
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
  width: 92px;
  height: auto;
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
  width: 44px;
  height: 44px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 18px;
  background:
    linear-gradient(135deg, rgba(114, 216, 79, 0.24), rgba(255, 255, 255, 0.92)),
    #fff;
  color: #1b2a1f;
  box-shadow: 0 14px 28px rgba(38, 67, 43, 0.13);
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
}

.avatar-button::after {
  position: absolute;
  right: 3px;
  bottom: 4px;
  width: 10px;
  height: 10px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #72d84f;
  content: '';
}
</style>
