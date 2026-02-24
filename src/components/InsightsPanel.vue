<template>
  <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
    <h2 class="text-2xl font-bold mb-4">Insights</h2>
    
    <div v-if="loading" class="text-gray-600 text-center py-8">
      Loading insights...
    </div>
    
    <div v-else-if="!summaries || summaries.length === 0" class="text-gray-600 text-center py-8">
      No data available for insights
    </div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <!-- Card 1: Glycogen Store Level -->
      <div class="border border-gray-200 rounded-lg p-4">
        <h3 class="text-sm font-medium text-gray-600 mb-2">Glycogen Store</h3>
        <div class="flex items-baseline gap-2 mb-1">
          <span class="text-3xl font-bold">{{ currentFillPct }}%</span>
          <span class="text-sm text-gray-600">{{ currentStoreEnd }}/{{ currentCapacity }}g</span>
        </div>
        <!-- Tank bar -->
        <div class="relative w-full h-4 bg-gray-200 rounded-full mb-2 overflow-hidden">
          <div
            class="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
            :class="tankColor"
            :style="{ width: (tankWidthPct / 120 * 100) + '%' }"
          ></div>
          <!-- 100% baseline marker -->
          <div class="absolute inset-y-0 border-r-2 border-gray-800 opacity-40" :style="{ left: (100 / 120 * 100) + '%' }"></div>
        </div>
        <div class="flex items-center gap-2 mb-1">
          <span
            class="px-2 py-0.5 text-xs rounded-full"
            :class="getRiskBadgeClass(currentRisk)"
          >
            {{ currentRisk }}
          </span>
          <span v-if="currentSurplus > 0" class="text-xs text-blue-600 font-medium">+{{ currentSurplus }}g surplus</span>
          <span v-else-if="currentDeficit > 0" class="text-xs text-orange-600 font-medium">−{{ currentDeficit }}g deficit</span>
        </div>
        <div class="flex items-center gap-1">
          <span v-if="storeTrend !== 0" class="text-xs" :class="storeTrend > 0 ? 'text-green-600' : 'text-red-600'">
            {{ storeTrend > 0 ? '↑' : '↓' }} {{ Math.abs(storeTrend) }}g
          </span>
          <span class="text-xs text-gray-500">{{ trendDays }}-day trend</span>
        </div>
      </div>

      <!-- Card 2: Store Exposure -->
      <div class="border border-gray-200 rounded-lg p-4">
        <h3 class="text-sm font-medium text-gray-600 mb-2">Store Exposure</h3>
        <div class="space-y-2">
          <div>
            <div class="text-2xl font-bold">{{ lowFillDays }}</div>
            <div class="text-xs text-gray-600">Low fill days (&lt;60%)</div>
          </div>
          <div>
            <div class="text-lg font-semibold text-red-600">{{ veryLowFillDays }}</div>
            <div class="text-xs text-gray-600">Very low days (&lt;40%)</div>
          </div>
          <div v-if="surplusDays > 0">
            <div class="text-lg font-semibold text-blue-600">{{ surplusDays }}</div>
            <div class="text-xs text-gray-600">Surplus days (&gt;100%)</div>
          </div>
          <div class="text-xs text-gray-500">
            Longest low streak: {{ longestLowStreak }} days
          </div>
        </div>
      </div>
      
      <!-- Card 3: Training Load -->
      <div class="border border-gray-200 rounded-lg p-4">
        <h3 class="text-sm font-medium text-gray-600 mb-2">Training Load</h3>
        <div class="space-y-2">
          <div>
            <div class="text-2xl font-bold">{{ formatDuration(totalDuration) }}</div>
            <div class="text-xs text-gray-600">Total duration</div>
          </div>
          <div v-if="totalTSS > 0">
            <div class="text-lg font-semibold">{{ totalTSS }}</div>
            <div class="text-xs text-gray-600">Total TSS</div>
          </div>
          <div>
            <div class="text-lg font-semibold">{{ hardDays }}</div>
            <div class="text-xs text-gray-600">Hard days</div>
          </div>
        </div>
      </div>
      
      <!-- Card 4: Fueling Consistency -->
      <div class="border border-gray-200 rounded-lg p-4">
        <h3 class="text-sm font-medium text-gray-600 mb-2">Fueling Consistency</h3>
        <div class="space-y-2">
          <div>
            <div class="text-2xl font-bold">{{ hitTargetDays }}</div>
            <div class="text-xs text-gray-600">Days hit carb target (≥90%)</div>
          </div>
          <div>
            <div class="text-lg font-semibold">{{ avgAlignmentScore }}%</div>
            <div class="text-xs text-gray-600">Avg alignment score</div>
          </div>
          <div>
            <div class="text-lg font-semibold text-orange-600">{{ netCarbDeficit }}g</div>
            <div class="text-xs text-gray-600">Net carb deficit</div>
          </div>
        </div>
      </div>
      
      <!-- Card 5: Tomorrow Readiness (What-if) -->
      <div class="border border-gray-200 rounded-lg p-4">
        <h3 class="text-sm font-medium text-gray-600 mb-2">Tomorrow Readiness</h3>
        <div class="space-y-3">
          <div>
            <div class="text-xs text-gray-600 mb-1">Current projection</div>
            <div class="text-2xl font-bold">{{ currentReadiness }}%</div>
          </div>
          <div class="border-t pt-2">
            <div class="text-xs text-gray-600 mb-1">If +200g carbs today</div>
            <div class="flex items-baseline gap-2">
              <span class="text-xl font-bold text-green-600">{{ whatIfReadiness }}%</span>
              <span class="text-sm text-green-600">↑ {{ whatIfReadiness - currentReadiness }}</span>
            </div>
          </div>
          <p class="text-xs text-gray-500">
            +{{ whatIfStoreGain }}g store → {{ whatIfFillPctAfter }}% fill
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { FILL_THRESHOLDS, calculateWhatIfStore } from '../lib/thresholds'

const props = defineProps({
  summaries: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// ── Helpers ─────────────────────────────────────────────────────────
const chronologicalSummaries = computed(() => {
  if (!props.summaries || props.summaries.length === 0) return []
  return [...props.summaries].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
})

const latest = computed(() => {
  if (chronologicalSummaries.value.length === 0) return null
  return chronologicalSummaries.value[chronologicalSummaries.value.length - 1]
})

// Card 1: Glycogen Store Level
const currentFillPct = computed(() => latest.value?.fill_pct ?? 100)
const currentStoreEnd = computed(() => Math.round(latest.value?.glycogen_store_end_g ?? 0))
const currentCapacity = computed(() => Math.round(latest.value?.glycogen_capacity_g ?? 490))
const currentSurplus = computed(() => Math.round(latest.value?.glycogen_surplus_g ?? 0))
const currentDeficit = computed(() => Math.round(latest.value?.glycogen_deficit_g ?? 0))

const currentRisk = computed(() => latest.value?.risk_flag || 'green')

const trendDays = computed(() => Math.min(7, props.summaries.length))

const storeTrend = computed(() => {
  if (chronologicalSummaries.value.length < 2) return 0
  const trendLength = Math.min(7, chronologicalSummaries.value.length)
  const recent = chronologicalSummaries.value.slice(-trendLength)
  const oldestStore = recent[0]?.glycogen_store_end_g || 0
  const newestStore = recent[recent.length - 1]?.glycogen_store_end_g || 0
  return Math.round(newestStore - oldestStore)
})

// Tank bar: clamp display to 0-120%
const tankWidthPct = computed(() => Math.min(120, Math.max(0, currentFillPct.value)))
const tankColor = computed(() => {
  const fill = currentFillPct.value
  if (fill >= FILL_THRESHOLDS.LOADED_MIN) return 'bg-blue-500'
  if (fill >= FILL_THRESHOLDS.GREEN_MIN) return 'bg-green-500'
  if (fill >= FILL_THRESHOLDS.YELLOW_MIN) return 'bg-yellow-500'
  if (fill >= FILL_THRESHOLDS.ORANGE_MIN) return 'bg-orange-500'
  return 'bg-red-500'
})

function getRiskBadgeClass(risk) {
  const classes = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-red-100 text-red-800'
  }
  return classes[risk] || 'bg-gray-100 text-gray-800'
}

// Card 2: Store Exposure (replaces Debt Exposure)
const lowFillDays = computed(() => {
  return chronologicalSummaries.value.filter(s => (s.fill_pct ?? 100) < FILL_THRESHOLDS.YELLOW_MIN).length
})

const veryLowFillDays = computed(() => {
  return chronologicalSummaries.value.filter(s => (s.fill_pct ?? 100) < FILL_THRESHOLDS.ORANGE_MIN).length
})

const surplusDays = computed(() => {
  return chronologicalSummaries.value.filter(s => (s.glycogen_surplus_g || 0) > 0).length
})

const longestLowStreak = computed(() => {
  let maxStreak = 0
  let currentStreak = 0

  chronologicalSummaries.value.forEach(s => {
    if ((s.fill_pct ?? 100) < FILL_THRESHOLDS.YELLOW_MIN) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 0
    }
  })

  return maxStreak
})

// Card 3: Training Load
const totalDuration = computed(() => {
  return chronologicalSummaries.value.reduce((sum, s) => sum + (s.total_duration_min || 0), 0)
})

const totalTSS = computed(() => {
  return Math.round(chronologicalSummaries.value.reduce((sum, s) => sum + (s.total_tss || 0), 0))
})

const hardDays = computed(() => {
  return chronologicalSummaries.value.filter(s => s.is_hard_day).length
})

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

// Card 4: Fueling Consistency
const hitTargetDays = computed(() => {
  return chronologicalSummaries.value.filter(s => {
    if (!s.carb_target_g || !s.carbs_logged_g) return false
    return (s.carbs_logged_g / s.carb_target_g) >= 0.9
  }).length
})

const avgAlignmentScore = computed(() => {
  const scores = chronologicalSummaries.value.filter(s => s.alignment_score > 0).map(s => s.alignment_score)
  if (scores.length === 0) return 0
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
})

const netCarbDeficit = computed(() => {
  return Math.round(chronologicalSummaries.value.reduce((sum, s) => {
    const deficit = Math.max(0, (s.carb_target_g || 0) - (s.carbs_logged_g || 0))
    return sum + deficit
  }, 0))
})

// Card 5: Tomorrow Readiness (store-aware what-if)
const currentReadiness = computed(() => {
  if (!latest.value) return 0
  return latest.value.readiness_score || 0
})

const whatIfResult = computed(() => {
  return calculateWhatIfStore(currentStoreEnd.value, currentCapacity.value, 200)
})

const whatIfReadiness = computed(() => whatIfResult.value.readinessAfter)
const whatIfFillPctAfter = computed(() => whatIfResult.value.fillPctAfter)
const whatIfStoreGain = computed(() => Math.round(whatIfResult.value.storeAfter - currentStoreEnd.value))
</script>
