import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initLogin } from './state/authState'

async function bootstrap() {
  // 先挂载壳层，再开始免登。免登码获取失败时用户仍能看到错误原因并重试，
  // 而不是只看到全局背景。
  createApp(App).use(router).mount('#app')
  await initLogin()
}

bootstrap()
