<template>
  <div class="max-w-6xl mx-auto p-6">
    <!-- Back Button -->
    <div class="mb-6">
      <button @click="goBack" class="text-gray-600 hover:text-black transition flex items-center gap-2">
        <span>←</span>
        <span>Back to Calendar</span>
      </button>
    </div>
    
    <!-- Loading State -->
    <div v-if="loading" class="bg-gray-50 border border-gray-200 rounded-lg p-8">
      <p class="text-gray-600 text-center">Loading day details...</p>
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-8">
      <p class="text-red-600 text-center">{{ error }}</p>
    </div>
    
    <!-- Day Detail Content -->
    <div v-else class="space-y-6">
      <!-- Day Detail Card -->
      <DayDetailCard
        :date="date"
        :day-summary="daySummary"
        :day-intake="dayIntake"
      />
      
      <!-- Workouts Section -->
      <div class="bg-white border border-gray-200 rounded-lg p-6">
        <h3 class="text-xl font-semibold mb-4">Workouts</h3>
        
        <div v-if="workouts.length > 0" class="space-y-3">
          <div
            v-for="workout in workouts"
            :key="workout.id"
            class="bg-gray-50 rounded-lg p-4"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="font-semibold">{{ workout.name || 'Untitled Workout' }}</div>
                <div class="text-sm text-gray-600 mt-1">
                  <span class="capitalize">{{ workout.sport }}</span>
                  <span v-if="workout.duration_min"> • {{ workout.duration_min }} min</span>
                  <span v-if="workout.tss"> • TSS: {{ workout.tss }}</span>
                  <span v-if="workout.calories"> • {{ workout.calories }} cal</span>
                </div>
                <div v-if="workout.description" class="text-sm text-gray-500 mt-2">
                  {{ workout.description }}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="text-center text-gray-500 py-8">
          No workouts for this day
        </div>
      </div>
      
      <!-- Intake Logger -->
      <IntakeLogger :initial-date="date" @saved="handleIntakeSaved" @cleared="handleIntakeCleared" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { user } from '../lib/auth'
import { getDaySummaries, getDayIntake, getWorkouts } from '../lib/database'
import DayDetailCard from '../components/DayDetailCard.vue'
import IntakeLogger from '../components/IntakeLogger.vue'

const route = useRoute()
const router = useRouter()

const date = computed(() => route.params.date)
const loading = ref(false)
const error = ref(null)
const daySummary = ref(null)
const dayIntake = ref(null)
const workouts = ref([])

onMounted(async () => {
  if (user.value) {
    await loadDayData()
  } else {
    error.value = 'Please sign in to view day details'
  }
})

async function loadDayData() {
  loading.value = true
  error.value = null
  
  try {
    // Fetch day summary, intake, and workouts in parallel
    const [summaryResult, intakeResult, workoutsResult] = await Promise.all([
      getDaySummaries(user.value.id, { 
        startDate: date.value, 
        endDate: date.value 
      }),
      getDayIntake(user.value.id, date.value),
      getWorkouts(user.value.id, { 
        startDate: date.value, 
        endDate: date.value 
      })
    ])
    
    if (summaryResult.error) {
      throw new Error('Failed to load summary: ' + summaryResult.error.message)
    }
    
    if (intakeResult.error) {
      console.warn('Failed to load intake:', intakeResult.error.message)
      // Don't throw - intake might not exist yet
    }
    
    if (workoutsResult.error) {
      throw new Error('Failed to load workouts: ' + workoutsResult.error.message)
    }
    
    daySummary.value = summaryResult.data && summaryResult.data.length > 0 
      ? summaryResult.data[0] 
      : null
    
    dayIntake.value = intakeResult.data || null
    workouts.value = workoutsResult.data || []
    
  } catch (err) {
    console.error('Error loading day data:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push('/calendar')
}

async function handleIntakeSaved() {
  // Reload intake data
  const result = await getDayIntake(user.value.id, date.value)
  if (!result.error) {
    dayIntake.value = result.data
  }
}

async function handleIntakeCleared() {
  dayIntake.value = null
}
</script>

