<template>
  <div
    class="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
    :class="cardBorderClass"
    @click="$emit('click')"
  >
    <!-- Header: Date + Risk Badge -->
    <div class="flex items-start justify-between mb-4">
      <div>
        <div class="font-semibold text-lg">{{ formattedDate }}</div>
        <div class="text-xs text-gray-500">{{ dayOfWeek }}</div>
      </div>

      <!-- Risk Badge (from ledger) — only when intake exists -->
      <div v-if="daySummary?.risk_flag && daySummary.risk_flag !== 'gray'" :class="getRiskBadgeClass(daySummary.risk_flag)" class="px-2 py-1 rounded-full text-xs font-semibold">
        {{ daySummary.risk_flag }}
      </div>

      <!-- No-intake badge -->
      <div v-else-if="daySummary && !daySummary.has_intake" class="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        no intake logged
      </div>

      <!-- Rest Day Badge -->
      <div v-else-if="!daySummary" class="px-2 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-500">
        Rest
      </div>
    </div>

    <!-- NO INTAKE STATE: Training data + prompt to log -->
    <div v-if="daySummary && !daySummary.has_intake" class="space-y-3">
      <!-- Training Summary -->
      <div v-if="daySummary.total_tss > 0 || daySummary.total_duration_min > 0" class="grid grid-cols-2 gap-2">
        <div class="bg-gray-50 rounded px-2 py-1">
          <div class="text-sm font-bold">{{ daySummary.total_duration_min }}min</div>
          <div class="text-xs text-gray-600">Duration</div>
        </div>
        <div class="bg-gray-50 rounded px-2 py-1">
          <div class="text-sm font-bold">{{ daySummary.total_tss || '-' }}</div>
          <div class="text-xs text-gray-600">TSS</div>
        </div>
      </div>

      <!-- Targets (what they should aim for) -->
      <div v-if="daySummary.carb_target_g" class="text-xs space-y-1 text-gray-500">
        <div class="flex justify-between">
          <span>Carb target:</span>
          <span class="font-medium">{{ daySummary.carb_target_g }}g</span>
        </div>
        <div class="flex justify-between">
          <span>Protein target:</span>
          <span class="font-medium">{{ daySummary.protein_target_g }}g</span>
        </div>
      </div>

      <!-- Prompt to log intake -->
      <div class="border border-dashed border-gray-300 rounded-lg p-3 text-center">
        <div class="text-sm text-gray-500 mb-1">No nutrition data for this day</div>
        <div class="text-sm font-medium text-black flex items-center justify-center gap-1">
          <span>＋</span>
          <span>Log intake to unlock insights</span>
        </div>
      </div>
    </div>

    <!-- HAS INTAKE: Full coaching layout (3 tiles) -->
    <div v-else-if="daySummary && hasInsights" class="space-y-3">
      <!-- Tile 1: Debt -->
      <div class="border border-gray-200 rounded-lg p-3">
        <div class="text-xs font-medium text-gray-600 mb-1">Glycogen Debt</div>
        <div class="flex items-baseline gap-2 mb-1">
          <span class="text-2xl font-bold">{{ Math.round(daySummary.debt_end_g || 0) }}</span>
          <span class="text-sm text-gray-600">g</span>
          <span v-if="debtDelta !== 0" class="text-sm ml-auto" :class="debtDelta > 0 ? 'text-red-600' : 'text-green-600'">
            {{ debtDelta > 0 ? '↑' : '↓' }} {{ Math.abs(debtDelta) }}g
          </span>
        </div>
        <div class="text-sm font-medium">{{ daySummary.insight_headline }}</div>
      </div>

      <!-- Tile 2: Action -->
      <div class="border border-gray-200 rounded-lg p-3 bg-blue-50">
        <div class="text-xs font-medium text-gray-600 mb-1">Do This Today</div>
        <div class="text-sm">{{ daySummary.insight_action }}</div>
      </div>

      <!-- Tile 3: Why -->
      <div class="border border-gray-200 rounded-lg p-3">
        <div class="text-xs font-medium text-gray-600 mb-1">Why It Matters</div>
        <div class="text-xs text-gray-700 leading-relaxed">{{ daySummary.insight_why }}</div>
      </div>
    </div>

    <!-- Partial Insights (has intake + debt but no text insights yet) -->
    <div v-else-if="daySummary && hasDebtData" class="space-y-3">
      <div class="border border-gray-200 rounded-lg p-3">
        <div class="text-xs font-medium text-gray-600 mb-1">Glycogen Debt</div>
        <div class="flex items-baseline gap-2 mb-1">
          <span class="text-2xl font-bold">{{ Math.round(daySummary.debt_end_g || 0) }}</span>
          <span class="text-sm text-gray-600">g</span>
          <span v-if="debtDelta !== 0" class="text-sm ml-auto" :class="debtDelta > 0 ? 'text-red-600' : 'text-green-600'">
            {{ debtDelta > 0 ? '↑' : '↓' }} {{ Math.abs(debtDelta) }}g
          </span>
        </div>
        <div class="text-xs text-gray-500">
          Depletion: {{ Math.round(daySummary.depletion_total_g || 0) }}g |
          Repletion: {{ Math.round(daySummary.repletion_g || 0) }}g
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div class="bg-gray-50 rounded px-2 py-1">
          <div class="text-sm font-bold">{{ daySummary.total_duration_min }}min</div>
          <div class="text-xs text-gray-600">Duration</div>
        </div>
        <div class="bg-gray-50 rounded px-2 py-1">
          <div class="text-sm font-bold">{{ daySummary.total_tss || '-' }}</div>
          <div class="text-xs text-gray-600">TSS</div>
        </div>
      </div>

      <div class="text-xs space-y-1">
        <div class="flex justify-between text-gray-600">
          <span>Carbs:</span>
          <span class="font-medium">
            <span v-if="dayIntake">{{ dayIntake.carbs_g }}g / </span>{{ daySummary.carb_target_g }}g
          </span>
        </div>
        <div class="flex justify-between text-gray-600">
          <span>Protein:</span>
          <span class="font-medium">
            <span v-if="dayIntake">{{ dayIntake.protein_g }}g / </span>{{ daySummary.protein_target_g }}g
          </span>
        </div>
      </div>
    </div>

    <!-- Fallback: daySummary exists but no debt/insights -->
    <div v-else-if="daySummary" class="space-y-3">
      <div class="grid grid-cols-2 gap-2">
        <div class="bg-gray-50 rounded px-2 py-1">
          <div class="text-sm font-bold">{{ daySummary.total_duration_min }}min</div>
          <div class="text-xs text-gray-600">Duration</div>
        </div>
        <div class="bg-gray-50 rounded px-2 py-1">
          <div class="text-sm font-bold">{{ daySummary.total_tss || '-' }}</div>
          <div class="text-xs text-gray-600">TSS</div>
        </div>
      </div>

      <div class="text-xs space-y-1">
        <div class="flex justify-between text-gray-600">
          <span>Carbs:</span>
          <span class="font-medium">{{ daySummary.carb_target_g }}g target</span>
        </div>
        <div class="flex justify-between text-gray-600">
          <span>Protein:</span>
          <span class="font-medium">{{ daySummary.protein_target_g }}g target</span>
        </div>
        <div class="pt-1 text-gray-500 font-medium flex items-center gap-1">
          <span>→</span>
          <span>Click to log intake</span>
        </div>
      </div>
    </div>

    <!-- Rest Day -->
    <div v-else class="text-sm text-gray-400 italic">
      Rest day — no training logged
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

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
  },
  previousDaySummary: {
    type: Object,
    default: null
  }
})

defineEmits(['click'])

const formattedDate = computed(() => {
  const date = new Date(props.date + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
})

const dayOfWeek = computed(() => {
  const date = new Date(props.date + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'long' })
})

// Check if day has insights (from ledger recompute)
const hasInsights = computed(() => {
  return props.daySummary?.insight_headline &&
         props.daySummary?.insight_action &&
         props.daySummary?.insight_why
})

// Check if day has debt data (even without text insights)
const hasDebtData = computed(() => {
  return props.daySummary?.debt_end_g !== undefined &&
         props.daySummary?.debt_end_g !== null
})

// Calculate debt delta from yesterday
const debtDelta = computed(() => {
  if (!props.daySummary) return 0
  const debtEnd = props.daySummary.debt_end_g || 0
  const debtStart = props.daySummary.debt_start_g || 0
  return Math.round(debtEnd - debtStart)
})

// Risk badge styling
function getRiskBadgeClass(risk) {
  const classes = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-red-100 text-red-800'
  }
  return classes[risk] || 'bg-gray-100 text-gray-800'
}

// Card border based on risk level
const cardBorderClass = computed(() => {
  if (!props.daySummary) return 'border-gray-200'

  const risk = props.daySummary.risk_flag
  const borderMap = {
    green: 'border-green-300',
    yellow: 'border-yellow-300',
    orange: 'border-orange-300',
    red: 'border-red-300'
  }

  return borderMap[risk] || 'border-gray-200'
})
</script>

