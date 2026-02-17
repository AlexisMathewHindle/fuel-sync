<template>
  <div class="max-w-6xl mx-auto p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-3xl font-bold">Training Calendar</h1>

      <!-- Time Window Filter -->
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600 mr-2">Time Window:</span>
        <button
          v-for="option in timeWindowOptions"
          :key="option.value"
          @click="setTimeWindow(option.value)"
          class="px-3 py-1 text-sm rounded transition-colors"
          :class="daysFilter === option.value
            ? 'bg-black text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="bg-gray-50 border border-gray-200 rounded-lg p-8">
      <p class="text-gray-600 text-center">Loading your training data...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-8">
      <p class="text-red-600 text-center">{{ error }}</p>
    </div>

    <!-- Not Signed In -->
    <div v-else-if="!user" class="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
      <p class="text-yellow-800 text-center">Please sign in to view your training calendar</p>
      <div class="text-center mt-4">
        <router-link to="/settings" class="btn-primary">
          Go to Settings
        </router-link>
      </div>
    </div>

    <template v-else>
      <!-- Baseline Calibration Banner -->
      <BaselineBanner
        :visible="showBaselineBanner"
        :reason="baselineReason"
        :loading="baselineUpdating"
        @set-baseline="handleSetBaseline"
        @keep-fresh="handleKeepFresh"
        @dismiss="handleDismiss"
      />

      <!-- Insights Panel -->
      <InsightsPanel
        v-if="filteredSummaries.length > 0"
        :summaries="filteredSummaries"
        :loading="loading"
      />

      <!-- Day List -->
      <div v-if="filteredDays.length > 0" class="space-y-3">
        <DayCard
          v-for="day in filteredDays"
          :key="day.date"
          :date="day.date"
          :day-summary="day.summary"
          :day-intake="day.intake"
          @click="goToDay(day.date)"
        />
      </div>

      <!-- Empty State -->
      <div v-else class="bg-white border-2 border-dashed border-gray-300 rounded-lg p-12">
        <div class="text-center max-w-md mx-auto">
          <div class="text-6xl mb-4">📊</div>
          <h3 class="text-xl font-semibold mb-2">No workouts yet</h3>
          <p class="text-gray-600 mb-6">
            Get started by importing your training data from TrainingPeaks, Strava, or other platforms.
          </p>
          <router-link to="/import" class="btn-primary inline-block">
            Import Your First Workout
          </router-link>
          <p class="text-sm text-gray-500 mt-4">
            Once imported, you'll see your training calendar with daily nutrition targets and alignment scores.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { user } from '../lib/auth'
import { getDaySummaries, getDayIntakes, getUserSettings, upsertUserSettings } from '../lib/database'
import { shouldShowBaselinePrompt } from '../lib/baselineDetection'
import { recomputeLedger } from '../lib/ledger'
import DayCard from '../components/DayCard.vue'
import InsightsPanel from '../components/InsightsPanel.vue'
import BaselineBanner from '../components/BaselineBanner.vue'

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const error = ref(null)
const days = ref([])

// Baseline banner state
const showBaselineBanner = ref(false)
const baselineReason = ref(null)
const baselineUpdating = ref(false)
const userSettings = ref(null)

// Time window filter
const timeWindowOptions = [
  { label: '7d', value: 7 },
  { label: '14d', value: 14 },
  { label: '30d', value: 30 },
  { label: '42d', value: 42 }
]

// Initialize from URL query or localStorage or default to 30
const getInitialDaysFilter = () => {
  const queryDays = route.query.days
  if (queryDays) {
    const parsed = parseInt(queryDays)
    if (!isNaN(parsed) && parsed > 0) return parsed
  }

  const storedDays = localStorage.getItem('fuelSync_daysFilter')
  if (storedDays) {
    const parsed = parseInt(storedDays)
    if (!isNaN(parsed) && parsed > 0) return parsed
  }

  return 30 // default
}

const daysFilter = ref(getInitialDaysFilter())

// Filtered days based on time window
const filteredDays = computed(() => {
  return days.value.slice(0, daysFilter.value)
})

// Filtered summaries for InsightsPanel (only days with summaries)
const filteredSummaries = computed(() => {
  return filteredDays.value
    .filter(day => day.summary !== null)
    .map(day => day.summary)
})

// Set time window and persist
function setTimeWindow(numDays) {
  daysFilter.value = numDays

  // Update URL query
  router.replace({
    query: { ...route.query, days: numDays }
  })

  // Persist to localStorage
  localStorage.setItem('fuelSync_daysFilter', numDays.toString())
}

onMounted(async () => {
  if (user.value) {
    await loadCalendarData()
  }
})

// Watch for user login
watch(user, async (newUser) => {
  if (newUser) {
    await loadCalendarData()
  } else {
    days.value = []
  }
})

async function loadCalendarData() {
  loading.value = true
  error.value = null

  try {
    // Always fetch 60 days for full ledger context
    // (UI filter will control what's displayed)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 60)

    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    // Fetch day summaries, intakes, and settings in parallel
    const [summariesResult, intakesResult, settingsResult] = await Promise.all([
      getDaySummaries(user.value.id, {
        startDate: startDateStr,
        endDate: endDateStr
      }),
      getDayIntakes(user.value.id, {
        startDate: startDateStr,
        endDate: endDateStr
      }),
      getUserSettings(user.value.id)
    ])

    userSettings.value = settingsResult.data

    if (summariesResult.error) {
      throw new Error('Failed to load summaries: ' + summariesResult.error.message)
    }

    if (intakesResult.error) {
      console.warn('Failed to load intakes:', intakesResult.error.message)
      // Don't throw - intakes might not exist yet
    }

    // Create a map of intakes by date
    const intakesByDate = {}
    if (intakesResult.data) {
      intakesResult.data.forEach(intake => {
        intakesByDate[intake.date] = intake
      })
    }

    // Create a map of summaries by date
    const summariesByDate = {}
    if (summariesResult.data) {
      summariesResult.data.forEach(summary => {
        summariesByDate[summary.date] = summary
      })
    }

    // Generate all dates in range (60 days)
    const allDates = []
    const currentDate = new Date(endDate)

    for (let i = 0; i < 60; i++) {
      const dateStr = currentDate.toISOString().split('T')[0]
      allDates.push({
        date: dateStr,
        summary: summariesByDate[dateStr] || null,
        intake: intakesByDate[dateStr] || null
      })
      currentDate.setDate(currentDate.getDate() - 1)
    }

    days.value = allDates

    // Baseline detection: check if we should show the banner
    // Sort summaries chronologically (oldest first) for detection
    const chronologicalSummaries = (summariesResult.data || [])
      .filter(s => s.total_tss > 0 || s.depletion_total_g > 0)
      .sort((a, b) => a.date.localeCompare(b.date))

    const baselineCheck = shouldShowBaselinePrompt(userSettings.value, chronologicalSummaries)
    showBaselineBanner.value = baselineCheck.show
    baselineReason.value = baselineCheck.reason

    console.log('Loaded', allDates.length, 'days (displaying', daysFilter.value, ')')

  } catch (err) {
    console.error('Error loading calendar data:', err)
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// Baseline banner handlers
async function handleSetBaseline() {
  if (!user.value) return
  baselineUpdating.value = true
  try {
    await upsertUserSettings(user.value.id, {
      starting_debt_g: 250,
      baseline_prompt_dismissed: false,
      baseline_set_at: new Date().toISOString()
    })
    // Recompute ledger with new baseline
    await recomputeLedger(user.value.id, { days: 60 })
    showBaselineBanner.value = false
    // Refresh calendar data
    await loadCalendarData()
  } catch (err) {
    console.error('Error setting baseline:', err)
  } finally {
    baselineUpdating.value = false
  }
}

async function handleKeepFresh() {
  if (!user.value) return
  baselineUpdating.value = true
  try {
    await upsertUserSettings(user.value.id, {
      starting_debt_g: 0,
      baseline_prompt_dismissed: true,
      baseline_set_at: new Date().toISOString()
    })
    showBaselineBanner.value = false
  } catch (err) {
    console.error('Error keeping fresh:', err)
  } finally {
    baselineUpdating.value = false
  }
}

async function handleDismiss() {
  if (!user.value) return
  baselineUpdating.value = true
  try {
    await upsertUserSettings(user.value.id, {
      baseline_prompt_dismissed: true
    })
    showBaselineBanner.value = false
  } catch (err) {
    console.error('Error dismissing baseline:', err)
  } finally {
    baselineUpdating.value = false
  }
}

function goToDay(date) {
  router.push(`/calendar/${date}`)
}
</script>

