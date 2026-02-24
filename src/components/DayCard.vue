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

      <!-- Fuel Badge (glycogen store fill %) -->
      <div v-if="daySummary?.risk_flag" class="flex items-center gap-1">
        <div :class="getRiskBadgeClass(daySummary.risk_flag)" class="px-2 py-1 rounded-full text-xs font-semibold" title="Glycogen store fill level">
          ⛽ {{ fillPct }}%
        </div>
        <span v-if="isEstimatedIntake" class="text-[10px] text-gray-400" title="Intake not logged — store is estimated">est</span>
        <span v-else-if="isNoIntakeModel" class="text-[10px] text-gray-400" title="No intake estimate available">none</span>
      </div>

      <!-- Rest Day Badge -->
      <div v-else-if="!daySummary" class="px-2 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-500">
        Rest
      </div>
    </div>

    <!-- NO INTAKE STATE: Training data + compact prompt -->
    <div v-if="daySummary && intakeType !== 'logged'" class="space-y-3">
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

      <div v-if="isEstimatedIntake" class="bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs text-amber-800">
        Assumed intake: {{ estimatedIntakeG }}g carbs (60% of target)
      </div>
      <div v-else-if="isNoIntakeModel" class="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-xs text-gray-600">
        Intake estimate unavailable; repletion set to 0g.
      </div>

      <div class="text-xs text-gray-500">
        No nutrition data logged. Tap to add intake and replace estimates.
      </div>
    </div>

    <!-- HAS INTAKE: compact coaching layout -->
    <div v-else-if="daySummary && hasInsights" class="space-y-3">
      <div class="border border-gray-200 rounded-lg p-3 bg-gray-50">
        <div class="flex items-baseline gap-2">
          <span class="text-2xl font-bold">{{ fillPct }}%</span>
          <span class="text-sm text-gray-500">{{ storeEnd }}/{{ capacity }}g</span>
          <span v-if="storeDelta !== 0" class="text-sm ml-auto" :class="storeDelta > 0 ? 'text-green-600' : 'text-red-600'">
            {{ storeDelta > 0 ? '↑' : '↓' }} {{ Math.abs(storeDelta) }}g
          </span>
        </div>
        <div class="flex items-center gap-2 mt-1 text-xs">
          <span v-if="surplus > 0" class="text-blue-600 font-medium">+{{ surplus }}g surplus</span>
          <span v-else-if="deficit > 0" class="text-orange-600 font-medium">−{{ deficit }}g deficit</span>
          <span class="text-gray-500 ml-auto">trend: {{ debtTrendLabel }}</span>
        </div>
      </div>

      <div class="text-sm font-medium">{{ daySummary.insight_headline }}</div>
      <div class="text-sm text-gray-700">
        <span class="font-semibold">Action:</span> {{ compactAction }}
      </div>
      <div class="text-xs text-gray-500">Tap for full detail and explanation</div>
    </div>

    <!-- Partial Insights (has store data but no text insights yet) -->
    <div v-else-if="daySummary && hasStoreData" class="space-y-3">
      <div class="border border-gray-200 rounded-lg p-3">
        <div class="text-xs font-medium text-gray-600 mb-1">Glycogen Store</div>
        <div class="flex items-baseline gap-2 mb-1">
          <span class="text-2xl font-bold">{{ fillPct }}%</span>
          <span class="text-sm text-gray-500">{{ storeEnd }}/{{ capacity }}g</span>
          <span v-if="storeDelta !== 0" class="text-sm ml-auto" :class="storeDelta > 0 ? 'text-green-600' : 'text-red-600'">
            {{ storeDelta > 0 ? '↑' : '↓' }} {{ Math.abs(storeDelta) }}g
          </span>
        </div>
        <div class="flex items-center gap-2 mb-1">
          <span v-if="surplus > 0" class="text-xs text-blue-600 font-medium">+{{ surplus }}g surplus</span>
          <span v-else-if="deficit > 0" class="text-xs text-orange-600 font-medium">−{{ deficit }}g deficit</span>
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

    <!-- Fallback: daySummary exists but no store/insights -->
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

const intakeType = computed(() => {
  if (!props.daySummary) return 'none'
  if (props.daySummary.intake_type) return props.daySummary.intake_type
  return props.daySummary.has_intake ? 'logged' : 'none'
})

const isEstimatedIntake = computed(() => intakeType.value === 'estimated')
const isNoIntakeModel = computed(() => intakeType.value === 'none')
const estimatedIntakeG = computed(() => Math.round(props.daySummary?.estimated_intake_g || 0))
const debtTrendLabel = computed(() => props.daySummary?.debt_trend || 'stable')
const compactAction = computed(() => {
  const action = props.daySummary?.insight_action || ''
  const stripped = action.split(' Protein:')[0].trim()
  return stripped || action
})

// Check if day has insights (from ledger recompute)
const hasInsights = computed(() => {
  return props.daySummary?.insight_headline &&
         props.daySummary?.insight_action &&
         props.daySummary?.insight_why
})

// Check if day has store data (even without text insights)
const hasStoreData = computed(() => {
  return props.daySummary?.glycogen_store_end_g !== undefined &&
         props.daySummary?.glycogen_store_end_g !== null
})

// Store level info
const fillPct = computed(() => props.daySummary?.fill_pct ?? 0)
const storeEnd = computed(() => Math.round(props.daySummary?.glycogen_store_end_g ?? 0))
const capacity = computed(() => Math.round(props.daySummary?.glycogen_capacity_g ?? 0))
const surplus = computed(() => Math.round(props.daySummary?.glycogen_surplus_g ?? 0))
const deficit = computed(() => Math.round(props.daySummary?.glycogen_deficit_g ?? 0))

// Calculate store delta within this day (end - start)
const storeDelta = computed(() => {
  if (!props.daySummary) return 0
  const end = props.daySummary.glycogen_store_end_g || 0
  const start = props.daySummary.glycogen_store_start_g || 0
  return Math.round(end - start)
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

// Severity ranking for color comparison (higher = worse)
const COLOR_SEVERITY = { green: 0, yellow: 1, orange: 2, red: 3 }

function worstColor(a, b) {
  const sevA = COLOR_SEVERITY[a] ?? -1
  const sevB = COLOR_SEVERITY[b] ?? -1
  return sevA >= sevB ? a : b
}

// Alignment score computed from intake vs targets (same logic as DayDetailCard)
const alignmentColor = computed(() => {
  if (!props.dayIntake || !props.daySummary) return null
  const scores = calculateAlignmentScores(props.dayIntake, props.daySummary)
  return getScoreBadgeColor(scores.overallScore)
})

// Card border based on worst of risk level and alignment score
const cardBorderClass = computed(() => {
  if (!props.daySummary) return 'border-gray-200'

  const riskColor = props.daySummary.risk_flag || null
  const alignment = alignmentColor.value

  // Pick the worst (most severe) color visible in the detail view
  let effective = riskColor
  if (alignment) {
    effective = effective ? worstColor(effective, alignment) : alignment
  }

  const borderMap = {
    green: 'border-green-300',
    yellow: 'border-yellow-300',
    orange: 'border-orange-300',
    red: 'border-red-300'
  }

  return borderMap[effective] || 'border-gray-200'
})
</script>
