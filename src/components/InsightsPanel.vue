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
      <!-- Card 1: Current Glycogen Debt -->
      <div class="border border-gray-200 rounded-lg p-4">
        <h3 class="text-sm font-medium text-gray-600 mb-2">Current Glycogen Debt</h3>
        <div class="flex items-baseline gap-2 mb-2">
          <span class="text-3xl font-bold">{{ currentDebt }}</span>
          <span class="text-sm text-gray-600">g</span>
        </div>
        <div class="flex items-center gap-2 mb-2">
          <span 
            class="px-2 py-0.5 text-xs rounded-full"
            :class="getRiskBadgeClass(currentRisk)"
          >
            {{ currentRisk }}
          </span>
          <span v-if="debtTrend !== 0" class="text-sm" :class="debtTrend > 0 ? 'text-red-600' : 'text-green-600'">
            {{ debtTrend > 0 ? '↑' : '↓' }} {{ Math.abs(debtTrend) }}g
          </span>
        </div>
        <p class="text-xs text-gray-500">{{ trendDays }}-day trend</p>
      </div>
      
      <!-- Card 2: Debt Exposure -->
      <div class="border border-gray-200 rounded-lg p-4">
        <h3 class="text-sm font-medium text-gray-600 mb-2">Debt Exposure</h3>
        <div class="space-y-2">
          <div>
            <div class="text-2xl font-bold">{{ compromisedDays }}</div>
            <div class="text-xs text-gray-600">Compromised days (>350g)</div>
          </div>
          <div>
            <div class="text-lg font-semibold text-red-600">{{ highRiskDays }}</div>
            <div class="text-xs text-gray-600">High risk days (>600g)</div>
          </div>
          <div class="text-xs text-gray-500">
            Longest streak: {{ longestStreak }} days
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
            Extra carbs = {{ whatIfDebtReduction }}g debt reduction
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { DEBT_THRESHOLDS, calculateWhatIfReadiness } from '../lib/thresholds'

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

// Card 1: Current Glycogen Debt
const currentDebt = computed(() => {
  if (!props.summaries || props.summaries.length === 0) return 0
  return Math.round(props.summaries[props.summaries.length - 1]?.debt_end_g || 0)
})

const currentRisk = computed(() => {
  if (!props.summaries || props.summaries.length === 0) return 'green'
  return props.summaries[props.summaries.length - 1]?.risk_flag || 'green'
})

const trendDays = computed(() => Math.min(7, props.summaries.length))

const debtTrend = computed(() => {
  if (!props.summaries || props.summaries.length < 2) return 0
  const trendLength = Math.min(7, props.summaries.length)
  const recent = props.summaries.slice(-trendLength)
  const oldestDebt = recent[0]?.debt_end_g || 0
  const newestDebt = recent[recent.length - 1]?.debt_end_g || 0
  return Math.round(newestDebt - oldestDebt)
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

// Card 2: Debt Exposure
const compromisedDays = computed(() => {
  return props.summaries.filter(s => s.debt_end_g > DEBT_THRESHOLDS.COMPROMISED_THRESHOLD).length
})

const highRiskDays = computed(() => {
  return props.summaries.filter(s => s.debt_end_g > DEBT_THRESHOLDS.HIGH_RISK_THRESHOLD).length
})

const longestStreak = computed(() => {
  let maxStreak = 0
  let currentStreak = 0
  
  props.summaries.forEach(s => {
    if (s.debt_end_g > DEBT_THRESHOLDS.COMPROMISED_THRESHOLD) {
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
  return props.summaries.reduce((sum, s) => sum + (s.total_duration_min || 0), 0)
})

const totalTSS = computed(() => {
  return Math.round(props.summaries.reduce((sum, s) => sum + (s.total_tss || 0), 0))
})

const hardDays = computed(() => {
  return props.summaries.filter(s => s.is_hard_day).length
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
  return props.summaries.filter(s => {
    if (!s.carb_target_g || !s.carbs_logged_g) return false
    return (s.carbs_logged_g / s.carb_target_g) >= 0.9
  }).length
})

const avgAlignmentScore = computed(() => {
  const scores = props.summaries.filter(s => s.alignment_score > 0).map(s => s.alignment_score)
  if (scores.length === 0) return 0
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
})

const netCarbDeficit = computed(() => {
  return Math.round(props.summaries.reduce((sum, s) => {
    const deficit = Math.max(0, (s.carb_target_g || 0) - (s.carbs_logged_g || 0))
    return sum + deficit
  }, 0))
})

// Card 5: Tomorrow Readiness
const currentReadiness = computed(() => {
  if (!props.summaries || props.summaries.length === 0) return 0
  return props.summaries[props.summaries.length - 1]?.readiness_score || 0
})

const whatIfResult = computed(() => {
  return calculateWhatIfReadiness(currentDebt.value, 200)
})

const whatIfReadiness = computed(() => whatIfResult.value.readinessAfter)
const whatIfDebtReduction = computed(() => Math.round(currentDebt.value - whatIfResult.value.debtAfter))
</script>

