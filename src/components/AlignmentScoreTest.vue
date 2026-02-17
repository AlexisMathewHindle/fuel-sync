<template>
  <div class="bg-white border border-gray-200 rounded-lg p-6">
    <h3 class="text-xl font-semibold mb-4">Alignment Score Test</h3>
    
    <div class="space-y-6">
      <!-- Test Scenarios -->
      <div>
        <h4 class="font-semibold mb-3">Test Scenarios</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            v-for="scenario in scenarios"
            :key="scenario.name"
            @click="loadScenario(scenario)"
            class="text-left p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <div class="font-medium text-sm">{{ scenario.name }}</div>
            <div class="text-xs text-gray-600">{{ scenario.description }}</div>
          </button>
        </div>
      </div>
      
      <!-- Custom Input -->
      <div class="border-t pt-4">
        <h4 class="font-semibold mb-3">Custom Input</h4>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">Target Carbs (g)</label>
            <input v-model.number="targets.carb_target_g" type="number" class="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Actual Carbs (g)</label>
            <input v-model.number="intake.carbs_g" type="number" class="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Target Protein (g)</label>
            <input v-model.number="targets.protein_target_g" type="number" class="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Actual Protein (g)</label>
            <input v-model.number="intake.protein_g" type="number" class="w-full px-3 py-2 border rounded-lg" />
          </div>
        </div>
      </div>
      
      <!-- Results -->
      <div class="border-t pt-4">
        <h4 class="font-semibold mb-3">Calculated Scores</h4>
        <div class="grid grid-cols-3 gap-4">
          <div :class="getScoreBgClass(scores.carbScore)" class="rounded-lg p-4 text-center">
            <div class="text-3xl font-bold">{{ scores.carbScore }}%</div>
            <div class="text-sm mt-1">Carb Score</div>
            <div class="text-xs mt-1 opacity-75">{{ scores.carbScore >= 90 ? 'Excellent' : scores.carbScore >= 75 ? 'Good' : scores.carbScore >= 50 ? 'Fair' : 'Low' }}</div>
          </div>
          <div :class="getScoreBgClass(scores.proteinScore)" class="rounded-lg p-4 text-center">
            <div class="text-3xl font-bold">{{ scores.proteinScore }}%</div>
            <div class="text-sm mt-1">Protein Score</div>
            <div class="text-xs mt-1 opacity-75">{{ scores.proteinScore >= 90 ? 'Excellent' : scores.proteinScore >= 75 ? 'Good' : scores.proteinScore >= 50 ? 'Fair' : 'Low' }}</div>
          </div>
          <div :class="getScoreBgClass(scores.overallScore)" class="rounded-lg p-4 text-center">
            <div class="text-3xl font-bold">{{ scores.overallScore }}%</div>
            <div class="text-sm mt-1">Overall Score</div>
            <div class="text-xs mt-1 opacity-75">60% carbs + 40% protein</div>
          </div>
        </div>
      </div>
      
      <!-- Calculation Breakdown -->
      <div class="bg-gray-50 rounded-lg p-4 text-sm">
        <h5 class="font-semibold mb-2">Calculation Breakdown:</h5>
        <ul class="space-y-1 text-gray-700">
          <li><strong>Carb Score:</strong> min(100, {{ intake.carbs_g }} / {{ targets.carb_target_g }} × 100) = {{ scores.carbScore }}%</li>
          <li><strong>Protein Score:</strong> min(100, {{ intake.protein_g }} / {{ targets.protein_target_g }} × 100) = {{ scores.proteinScore }}%</li>
          <li><strong>Overall Score:</strong> ({{ scores.carbScore }} × 0.6) + ({{ scores.proteinScore }} × 0.4) = {{ scores.overallScore }}%</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { calculateAlignmentScores, getScoreBadgeColor } from '../lib/alignmentScore'

const targets = ref({
  carb_target_g: 300,
  protein_target_g: 150
})

const intake = ref({
  carbs_g: 0,
  protein_g: 0
})

const scenarios = [
  {
    name: 'Perfect Match',
    description: '100% of both targets',
    values: { targets: { carb_target_g: 300, protein_target_g: 150 }, intake: { carbs_g: 300, protein_g: 150 } }
  },
  {
    name: 'Good Day',
    description: '90% of targets',
    values: { targets: { carb_target_g: 300, protein_target_g: 150 }, intake: { carbs_g: 270, protein_g: 135 } }
  },
  {
    name: 'Carbs Low',
    description: 'Hit protein, missed carbs',
    values: { targets: { carb_target_g: 300, protein_target_g: 150 }, intake: { carbs_g: 180, protein_g: 150 } }
  },
  {
    name: 'Protein Low',
    description: 'Hit carbs, missed protein',
    values: { targets: { carb_target_g: 300, protein_target_g: 150 }, intake: { carbs_g: 300, protein_g: 90 } }
  },
  {
    name: 'Both Low',
    description: '50% of both targets',
    values: { targets: { carb_target_g: 300, protein_target_g: 150 }, intake: { carbs_g: 150, protein_g: 75 } }
  },
  {
    name: 'Over Target',
    description: '120% of targets (capped at 100)',
    values: { targets: { carb_target_g: 300, protein_target_g: 150 }, intake: { carbs_g: 360, protein_g: 180 } }
  }
]

const scores = computed(() => {
  return calculateAlignmentScores(intake.value, targets.value)
})

function loadScenario(scenario) {
  targets.value = { ...scenario.values.targets }
  intake.value = { ...scenario.values.intake }
}

function getScoreBgClass(score) {
  const color = getScoreBadgeColor(score)
  const colorMap = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-red-100 text-red-800'
  }
  return colorMap[color] || 'bg-gray-100 text-gray-800'
}
</script>

