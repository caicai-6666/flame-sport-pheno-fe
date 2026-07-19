import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initLogin } from './state/authState'

async function bootstrap() {
  await initLogin()
  createApp(App).use(router).mount('#app')
}

bootstrap()
