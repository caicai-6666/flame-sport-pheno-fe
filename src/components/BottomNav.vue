<template>
  <nav class="bottom-nav" aria-label="底部导航">
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      class="nav-item"
      :class="{ 'is-active': item.key === activeKey }"
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
  emits: ['change']
}
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  z-index: 4;
  right: 50%;
  bottom: 16px;
  width: min(calc(100vw - 28px), 398px);
  min-height: 72px;
  padding: 8px;
  border: 1px solid rgba(23, 33, 27, 0.08);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 18px 44px rgba(29, 52, 35, 0.16);
  backdrop-filter: blur(18px);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  transform: translateX(50%);
}

.nav-item {
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
  transition: color 0.2s ease, background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.nav-item:active {
  transform: scale(0.97);
}

.nav-icon {
  font-size: 17px;
  line-height: 1;
}

.nav-label {
  font-size: 12px;
  font-weight: 750;
  line-height: 1;
}

.nav-item.is-active {
  background: linear-gradient(135deg, #70dd4d, #39b54a);
  color: #fff;
  box-shadow: 0 12px 22px rgba(58, 181, 74, 0.32);
}
</style>
