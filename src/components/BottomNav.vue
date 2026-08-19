<template>
  <nav class="bottom-nav" :style="selectionStyle" aria-label="底部导航">
    <span class="nav-selection" aria-hidden="true"></span>
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      class="nav-item"
      :class="{ 'is-active': item.key === activeKey }"
      :aria-current="item.key === activeKey ? 'page' : undefined"
      @click="$emit('change', item.key)"
    >
      <span class="nav-icon">{{ item.icon }}</span>
      <span class="nav-label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<script>
export default {
  name: 'BottomNav',
  props: {
    items: {
      type: Array,
      required: true
    },
    activeKey: {
      type: String,
      required: true
    }
  },
  computed: {
    activeIndex() {
      const index = this.items.findIndex(item => item.key === this.activeKey)
      return index >= 0 ? index : 0
    },
    selectionStyle() {
      const itemCount = Math.max(this.items.length, 1)

      return {
        // 扣除导航两侧各 8px 内边距，使玻璃框始终与按钮栅格精确对齐。
        '--nav-selection-width': `calc(${100 / itemCount}% - ${16 / itemCount}px)`,
        '--nav-selection-offset': `${this.activeIndex * 100}%`
      }
    }
  },
  emits: ['change']
}
</script>

<style scoped>
.bottom-nav {
  /* 应用壳层本身不滚动，使用壳层定位可避开 iOS WebView 对 fixed visual viewport 的裁剪。 */
  position: absolute;
  z-index: 4;
  right: 50%;
  bottom: 4px;
  bottom: var(--bottom-nav-offset, 12px);
  overflow: hidden;
  width: min(calc(100vw - 28px), 398px);
  min-height: 72px;
  padding: 8px;
  border: 1px solid rgba(213, 235, 218, 0.72);
  border-radius: 28px;
  background: rgba(226, 239, 229, 0.8);
  box-shadow:
    0 18px 44px rgba(29, 52, 35, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(20px) saturate(1.18);
  -webkit-backdrop-filter: blur(20px) saturate(1.18);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  isolation: isolate;
  transform: translateX(50%);
}

.bottom-nav::before {
  position: absolute;
  z-index: 0;
  inset: -50% -18%;
  background:
    radial-gradient(circle at 25% 45%, rgba(61, 166, 71, 0.2), transparent 26%),
    radial-gradient(circle at 72% 54%, rgba(35, 151, 132, 0.17), transparent 25%),
    radial-gradient(circle at 52% 30%, rgba(255, 255, 255, 0.5), transparent 22%);
  content: '';
  pointer-events: none;
  animation: nav-ambient-flow 11s ease-in-out infinite alternate;
}

.nav-selection {
  position: absolute;
  z-index: 1;
  top: 8px;
  bottom: 8px;
  left: 8px;
  overflow: hidden;
  width: var(--nav-selection-width);
  border: 1px solid rgba(231, 250, 233, 0.82);
  border-radius: 21px;
  background:
    linear-gradient(145deg, rgba(239, 255, 241, 0.6), rgba(122, 195, 134, 0.28)),
    rgba(47, 143, 67, 0.24);
  box-shadow:
    0 10px 24px rgba(28, 108, 52, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.86),
    inset 0 -1px 0 rgba(31, 112, 54, 0.22);
  backdrop-filter: blur(14px) saturate(1.32);
  -webkit-backdrop-filter: blur(14px) saturate(1.32);
  pointer-events: none;
  transform: translate3d(var(--nav-selection-offset), 0, 0);
  transition: transform 0.5s cubic-bezier(0.22, 0.78, 0.2, 1);
  will-change: transform;
}

.nav-selection::before,
.nav-selection::after {
  position: absolute;
  content: '';
  pointer-events: none;
}

.nav-selection::before {
  inset: -36% -55%;
  background:
    radial-gradient(circle at 30% 46%, rgba(61, 171, 74, 0.48), transparent 26%),
    radial-gradient(circle at 66% 54%, rgba(41, 169, 148, 0.32), transparent 24%),
    linear-gradient(112deg, transparent 33%, rgba(255, 255, 255, 0.48) 49%, transparent 64%);
  filter: blur(7px);
  opacity: 0.82;
  animation: nav-selection-flow 5.6s ease-in-out infinite alternate;
}

.nav-selection::after {
  inset: 1px;
  border-radius: 19px;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.3),
    inset 8px 10px 18px rgba(255, 255, 255, 0.16);
}

.nav-item {
  position: relative;
  z-index: 2;
  min-width: 0;
  border: 0;
  border-radius: 21px;
  background: transparent;
  color: rgba(23, 33, 27, 0.52);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: color 0.3s ease, transform 0.2s ease, text-shadow 0.3s ease;
}

.nav-item:active {
  transform: scale(0.97);
}

.nav-icon {
  font-size: 17px;
  line-height: 1;
  transition: transform 0.36s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.nav-label {
  font-size: 12px;
  font-weight: 750;
  line-height: 1;
}

.nav-item.is-active {
  color: #155f31;
  text-shadow: 0 1px 8px rgba(255, 255, 255, 0.72);
}

.nav-item.is-active .nav-icon {
  transform: translateY(-1px) scale(1.08);
}

@keyframes nav-ambient-flow {
  0% {
    transform: translate3d(-4%, -2%, 0) scale(1);
  }

  100% {
    transform: translate3d(5%, 3%, 0) scale(1.06);
  }
}

@keyframes nav-selection-flow {
  0% {
    transform: translate3d(-16%, -3%, 0) rotate(-2deg);
  }

  100% {
    transform: translate3d(16%, 4%, 0) rotate(2deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bottom-nav::before,
  .nav-selection::before {
    animation: none;
  }

  .nav-selection {
    transition-duration: 1ms;
  }
}
</style>
