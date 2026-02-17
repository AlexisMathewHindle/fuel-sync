<template>
  <div class="bg-white border border-gray-200 rounded-lg p-6">
    <h3 class="text-xl font-semibold mb-4">Fueling Engine Test</h3>
    
    <div class="space-y-6">
      <!-- Test Scenarios -->
      <div>
        <h4 class="font-semibold mb-3">Test Scenarios</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            v-for="scenario in scenarios"
            :key="scenario.name"
            @click="loadScenario(scenario)"
            class="text-left p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            <div class="font-medium">{{ scenario.name }}</div>
            <div class="text-sm text-gray-600">{{ scenario.description }}</div>
          </button>
        </div>
      </div>
      
      <!-- Input Controls -->
      <div class="border-t pt-4">
        <h4 class="font-semibold mb-3">Custom Input</h4>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">Weight (kg)</label>
            <input v-model.number="inputs.weight_kg" type="number" class="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Protein g/kg</label>
            <input v-model.number="inputs.protein_g_per_kg" type="number" step="0.1" class="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Duration (min)</label>
            <input v-model.number="inputs.duration" type="number" class="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">TSS</label>
            <input v-model.number="inputs.tss" type="number" class="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Carb Factor</label>
            <input v-model.number="inputs.carb_factor" type="number" step="0.1" class="w-full px-3 py-2 border rounded-lg" />
          </div>
        </div>
      </div>
      
      <!-- Results -->
      <div class="border-t pt-4">
        <h4 class="font-semibold mb-3">Calculated Targets</h4>
        <div class="grid grid-cols-3 gap-4">
          <div class="bg-blue-50 rounded-lg p-4">
            <div class="text-2xl font-bold text-blue-600">{{ results.glycogen_debt_est }}</div>
            <div class="text-sm text-gray-600">Glycogen Debt</div>
            <div class="text-xs text-gray-500 mt-1">{{ loadDescription }}</div>
          </div>
          <div class="bg-green-50 rounded-lg p-4">
            <div class="text-2xl font-bold text-green-600">{{ results.carb_target_g }}g</div>
            <div class="text-sm text-gray-600">Carb Target</div>
          </div>
          <div class="bg-purple-50 rounded-lg p-4">
            <div class="text-2xl font-bold text-purple-600">{{ results.protein_target_g }}g</div>
            <div class="text-sm text-gray-600">Protein Target</div>
          </div>
        </div>
      </div>
      
      <!-- Explanation -->
      <div class="bg-gray-50 rounded-lg p-4 text-sm">
        <h5 class="font-semibold mb-2">Calculation Logic:</h5>
        <ul class="space-y-1 text-gray-700">
          <li><strong>Glycogen Debt:</strong> Based on TSS (if available) or duration. Scale 0-100.</li>
          <li><strong>Protein:</strong> {{ inputs.weight_kg }}kg × {{ inputs.protein_g_per_kg }}g/kg = {{ results.protein_target_g }}g</li>
          <li><strong>Carbs:</strong> Base ({{ inputs.weight_kg }}kg × 3g) + Training load {{ inputs.tss ? `(TSS ${inputs.tss} × 0.03)` : `(${inputs.duration}min × 0.8)` }} × {{ inputs.carb_factor }} factor</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { calculateNutritionTargets, getTrainingLoadDescription } from '../lib/fuelingEngine'

const inputs = ref({
  weight_kg: 70,
  protein_g_per_kg: 1.8,
  duration: 0,
  tss: 0,
  carb_factor: 1.0
})

const scenarios = [
  {
    name: 'Rest Day',
    description: 'No training',
    values: { weight_kg: 70, protein_g_per_kg: 1.8, duration: 0, tss: 0, carb_factor: 1.0 }
  },
  {
    name: 'Easy Run',
    description: '45min easy run',
    values: { weight_kg: 70, protein_g_per_kg: 1.8, duration: 45, tss: 35, carb_factor: 1.0 }
  },
  {
    name: 'Moderate Ride',
    description: '90min moderate bike',
    values: { weight_kg: 70, protein_g_per_kg: 1.8, duration: 90, tss: 85, carb_factor: 1.0 }
  },
  {
    name: 'Hard Workout',
    description: '2hr hard training',
    values: { weight_kg: 70, protein_g_per_kg: 1.8, duration: 120, tss: 150, carb_factor: 1.0 }
  },
  {
    name: 'Big Day',
    description: '3hr+ long ride',
    values: { weight_kg: 70, protein_g_per_kg: 1.8, duration: 200, tss: 250, carb_factor: 1.0 }
  },
  {
    name: 'Race Day',
    description: 'Very hard effort',
    values: { weight_kg: 70, protein_g_per_kg: 1.8, duration: 150, tss: 300, carb_factor: 1.2 }
  }
]

const results = computed(() => {
  const daySummary = {
    total_duration_min: inputs.value.duration,
    total_tss: inputs.value.tss
  }
  
  const userSettings = {
    weight_kg: inputs.value.weight_kg,
    protein_g_per_kg: inputs.value.protein_g_per_kg,
    carb_factor: inputs.value.carb_factor
  }
  
  return calculateNutritionTargets(daySummary, userSettings)
})

const loadDescription = computed(() => {
  return getTrainingLoadDescription(results.value.glycogen_debt_est)
})

function loadScenario(scenario) {
  inputs.value = { ...scenario.values }
}
</script>

