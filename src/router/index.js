import { createRouter, createWebHistory } from 'vue-router'
import ImportView from '../views/ImportView.vue'
import CalendarView from '../views/CalendarView.vue'
import DayDetailView from '../views/DayDetailView.vue'
import WorkoutDetailView from '../views/WorkoutDetailView.vue'
import SettingsView from '../views/SettingsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/calendar'
    },
    {
      path: '/import',
      name: 'import',
      component: ImportView
    },
    {
      path: '/calendar',
      name: 'calendar',
      component: CalendarView
    },
    {
      path: '/calendar/:date',
      name: 'day-detail',
      component: DayDetailView
    },
    {
      path: '/workouts/:id',
      name: 'workout-detail',
      component: WorkoutDetailView
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView
    }
  ]
})

export default router

