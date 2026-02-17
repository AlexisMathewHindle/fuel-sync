import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { testConnection } from './lib/supabase'
import { initAuth } from './lib/auth'

const app = createApp(App)

app.use(router)

app.mount('#app')

// Initialize auth and test Supabase connection on app start
initAuth()
testConnection()
