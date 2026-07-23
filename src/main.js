import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initLogin } from './state/authState'

async function bootstrap() {
  // 先挂载含启动封面的壳层，再立即开始免登；封面不会阻塞登录或首屏数据请求。
  createApp(App).use(router).mount('#app')
  await initLogin()
}

bootstrap()
