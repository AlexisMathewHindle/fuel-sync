<template>
  <div class="bg-white border border-gray-200 rounded-lg p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-xl font-semibold">{{ formattedDate }}</h3>
      <div v-if="alignmentScore !== null" class="flex items-center gap-2">
        <span class="text-sm text-gray-600">Alignment:</span>
        <div :class="scoreBadgeClass" class="px-3 py-1 rounded-full font-semibold">
          {{ alignmentScore }}%
        </div>
      </div>
    </div>
    
    <!-- Training Summary -->
    <div v-if="daySummary" class="mb-6">
      <h4 class="font-semibold mb-2">Training</h4>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div class="bg-gray-50 rounded-lg p-3">
          <div class="text-lg font-bold">{{ daySummary.total_duration_min }}min</div>
          <div class="text-xs text-gray-600">Duration</div>
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <div class="text-lg font-bold">{{ daySummary.total_tss || '-' }}</div>
          <div class="text-xs text-gray-600">TSS</div>
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <div class="text-lg font-bold">{{ daySummary.total_calories || '-' }}</div>
          <div class="text-xs text-gray-600">Calories</div>
        </div>
        <div class="bg-gray-50 rounded-lg p-3">
          <div class="text-lg font-bold">{{ debtDisplay }}</div>
          <div class="text-xs text-gray-600">Glycogen Debt (end)</div>
        </div>
      </div>
      
      <!-- Sport Mix -->
      <div v-if="sportMixDisplay" class="mt-2 text-sm text-gray-600">
        <strong>Sports:</strong> {{ sportMixDisplay }}
      </div>

      <div v-if="modelingNote" class="mt-2 text-xs text-gray-500">
        <strong>Model:</strong> {{ modelingNote }}
      </div>
    </div>
    
    <!-- Nutrition: Target vs Actual -->
    <div class="mb-6">
      <h4 class="font-semibold mb-3">Nutrition</h4>
      
      <!-- Carbs -->
      <div class="mb-4">
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm font-medium">Carbohydrates</span>
          <span v-if="scores" :class="getScoreColorClass(scores.carbScore)" class="text-sm font-semibold">
            {{ scores.carbScore }}%
          </span>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <div class="flex-1">
            <div class="flex justify-between mb-1">
              <span class="text-gray-600">Target:</span>
              <span class="font-medium">{{ daySummary?.carb_target_g || '-' }}g</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Actual:</span>
              <span class="font-medium">{{ dayIntake?.carbs_g || '-' }}g</span>
            </div>
          </div>
        </div>
        <div v-if="daySummary?.carb_target_g && dayIntake?.carbs_g" class="mt-2">
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              :class="getProgressBarClass(scores?.carbScore)"
              class="h-2 rounded-full transition-all"
              :style="{ width: Math.min(100, (dayIntake.carbs_g / daySummary.carb_target_g) * 100) + '%' }"
            ></div>
          </div>
        </div>
      </div>
      
      <!-- Protein -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <span class="text-sm font-medium">Protein</span>
          <span v-if="scores" :class="getScoreColorClass(scores.proteinScore)" class="text-sm font-semibold">
            {{ scores.proteinScore }}%
          </span>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <div class="flex-1">
            <div class="flex justify-between mb-1">
              <span class="text-gray-600">Target:</span>
              <span class="font-medium">{{ daySummary?.protein_target_g || '-' }}g</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600">Actual:</span>
              <span class="font-medium">{{ dayIntake?.protein_g || '-' }}g</span>
            </div>
          </div>
        </div>
        <div v-if="daySummary?.protein_target_g && dayIntake?.protein_g" class="mt-2">
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              :class="getProgressBarClass(scores?.proteinScore)"
              class="h-2 rounded-full transition-all"
              :style="{ width: Math.min(100, (dayIntake.protein_g / daySummary.protein_target_g) * 100) + '%' }"
            ></div>
          </div>
        </div>
      </div>
      
      <!-- Notes -->
      <div v-if="dayIntake?.notes" class="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
        <strong>Notes:</strong> {{ dayIntake.notes }}
      </div>
    </div>
    
    <!-- No Data Message -->
    <div v-if="!daySummary && !dayIntake" class="text-center text-gray-500 py-8">
      No training or intake data for this day
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { calculateAlignmentScores, getScoreBadgeColor } from '../lib/alignmentScore'

const props = defineProps({
  date: {
    type: String,
    required: true
  },
  daySummary: {
    type: Object,
    default: null
  },
  dayIntake: {
    type: Object,
    default: null
  }
})

const formattedDate = computed(() => {
  const date = new Date(props.date + 'T00:00:00')
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
})

const sportMixDisplay = computed(() => {
  if (!props.daySummary?.sport_mix_json) return null
  const mix = props.daySummary.sport_mix_json
  return Object.entries(mix)
    .map(([sport, minutes]) => `${sport} (${minutes}min)`)
    .join(', ')
})

const scores = computed(() => {
  if (!props.dayIntake || !props.daySummary) return null
  return calculateAlignmentScores(props.dayIntake, props.daySummary)
})

const alignmentScore = computed(() => {
  return scores.value?.overallScore ?? null
})

const debtDisplay = computed(() => {
  if (!props.daySummary) return 0
  const debt = props.daySummary.debt_end_g ?? props.daySummary.glycogen_debt_est ?? 0
  return Math.round(debt)
})

const modelingNote = computed(() => {
  if (!props.daySummary) return null

  const intakeType = props.daySummary.intake_type || (props.daySummary.has_intake ? 'logged' : 'none')
  const debtTrend = props.daySummary.debt_trend || 'stable'

  if (intakeType === 'logged') {
    return `Intake logged. 3-day debt trend: ${debtTrend}.`
  }

  if (intakeType === 'estimated') {
    const estimated = Math.round(
      props.daySummary.estimated_intake_g ??
      ((props.daySummary.carb_target_g || 0) * 0.6)
    )
    return `No intake log. Repletion estimated from ${estimated}g carbs. 3-day debt trend: ${debtTrend}.`
  }

  return `No intake data available, so repletion was set to 0g. 3-day debt trend: ${debtTrend}.`
})

const scoreBadgeClass = computed(() => {
  if (alignmentScore.value === null) return ''
  const color = getScoreBadgeColor(alignmentScore.value)
  const colorMap = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-red-100 text-red-800'
  }
  return colorMap[color] || 'bg-gray-100 text-gray-800'
})

function getScoreColorClass(score) {
  const color = getScoreBadgeColor(score)
  const colorMap = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    orange: 'text-orange-600',
    red: 'text-red-600'
  }
  return colorMap[color] || 'text-gray-600'
}

function getProgressBarClass(score) {
  const color = getScoreBadgeColor(score)
  const colorMap = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500'
  }
  return colorMap[color] || 'bg-gray-500'
}
</script>
