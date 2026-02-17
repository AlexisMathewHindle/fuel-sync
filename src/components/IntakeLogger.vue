<template>
  <div class="bg-white border border-gray-200 rounded-lg p-4">
    <h4 class="font-semibold mb-3">Log Today's Intake</h4>
    
    <div v-if="!user" class="text-gray-600 text-sm">
      Please sign in to log intake.
    </div>
    
    <div v-else class="space-y-3">
      <!-- Date Selector -->
      <div>
        <label class="block text-sm font-medium mb-1">Date</label>
        <input
          v-model="selectedDate"
          type="date"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>
      
      <!-- Carbs Input -->
      <div>
        <label class="block text-sm font-medium mb-1">
          Carbs (grams)
          <span v-if="targets?.carb_target_g" class="text-gray-500 font-normal">
            - Target: {{ targets.carb_target_g }}g
          </span>
        </label>
        <input
          v-model.number="formData.carbs_g"
          type="number"
          min="0"
          max="1000"
          placeholder="e.g., 250"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>
      
      <!-- Protein Input -->
      <div>
        <label class="block text-sm font-medium mb-1">
          Protein (grams)
          <span v-if="targets?.protein_target_g" class="text-gray-500 font-normal">
            - Target: {{ targets.protein_target_g }}g
          </span>
        </label>
        <input
          v-model.number="formData.protein_g"
          type="number"
          min="0"
          max="500"
          placeholder="e.g., 120"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
        />
      </div>
      
      <!-- Notes -->
      <div>
        <label class="block text-sm font-medium mb-1">Notes (optional)</label>
        <textarea
          v-model="formData.notes"
          rows="2"
          placeholder="e.g., Had extra carbs post-workout"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
        ></textarea>
      </div>
      
      <!-- Actions -->
      <div class="flex gap-2">
        <button
          @click="saveIntake"
          :disabled="saving || !isValid"
          class="btn-primary flex-1"
        >
          {{ saving ? 'Saving...' : 'Save Intake' }}
        </button>
        
        <button
          v-if="existingIntake"
          @click="clearIntake"
          :disabled="saving"
          class="btn-secondary"
        >
          Clear
        </button>
      </div>
      
      <!-- Feedback -->
      <div v-if="saveMessage" class="text-sm">
        <div :class="saveSuccess ? 'text-green-600' : 'text-red-600'">
          {{ saveMessage }}
        </div>
      </div>
      
      <!-- Alignment Score Preview -->
      <div v-if="showScore && scores" class="border-t pt-3 mt-3">
        <div class="text-sm font-medium mb-2">Alignment Score</div>
        <div class="grid grid-cols-3 gap-2">
          <div class="text-center">
            <div :class="getScoreColorClass(scores.carbScore)" class="text-2xl font-bold">
              {{ scores.carbScore }}%
            </div>
            <div class="text-xs text-gray-600">Carbs</div>
          </div>
          <div class="text-center">
            <div :class="getScoreColorClass(scores.proteinScore)" class="text-2xl font-bold">
              {{ scores.proteinScore }}%
            </div>
            <div class="text-xs text-gray-600">Protein</div>
          </div>
          <div class="text-center">
            <div :class="getScoreColorClass(scores.overallScore)" class="text-2xl font-bold">
              {{ scores.overallScore }}%
            </div>
            <div class="text-xs text-gray-600">Overall</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { user } from '../lib/auth'
import { getDayIntake, upsertDayIntake, deleteDayIntake } from '../lib/database'
import { getDaySummaries } from '../lib/database'
import { calculateAlignmentScores, getScoreBadgeColor } from '../lib/alignmentScore'
import { recomputeLedger } from '../lib/ledger'

const props = defineProps({
  initialDate: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  }
})

const emit = defineEmits(['saved', 'cleared'])

const selectedDate = ref(props.initialDate)
const formData = ref({
  carbs_g: null,
  protein_g: null,
  notes: ''
})

const existingIntake = ref(null)
const targets = ref(null)
const saving = ref(false)
const saveMessage = ref('')
const saveSuccess = ref(false)

const isValid = computed(() => {
  return formData.value.carbs_g !== null || formData.value.protein_g !== null
})

const showScore = computed(() => {
  return formData.value.carbs_g > 0 || formData.value.protein_g > 0
})

const scores = computed(() => {
  if (!showScore.value || !targets.value) return null
  return calculateAlignmentScores(formData.value, targets.value)
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

// Load existing intake and targets when date changes
watch(selectedDate, loadData, { immediate: true })

async function loadData() {
  if (!user.value) return
  
  // Load existing intake
  const { data: intake } = await getDayIntake(user.value.id, selectedDate.value)
  existingIntake.value = intake
  
  if (intake) {
    formData.value = {
      carbs_g: intake.carbs_g,
      protein_g: intake.protein_g,
      notes: intake.notes || ''
    }
  } else {
    formData.value = {
      carbs_g: null,
      protein_g: null,
      notes: ''
    }
  }
  
  // Load targets from day_summaries
  const { data: summaries } = await getDaySummaries(user.value.id, {
    startDate: selectedDate.value,
    endDate: selectedDate.value
  })
  
  targets.value = summaries && summaries.length > 0 ? summaries[0] : null
}

async function saveIntake() {
  if (!user.value || !isValid.value) return

  saving.value = true
  saveMessage.value = ''

  try {
    const { error } = await upsertDayIntake(user.value.id, selectedDate.value, formData.value)

    if (error) {
      saveMessage.value = 'Failed to save: ' + error.message
      saveSuccess.value = false
    } else {
      saveMessage.value = '✓ Intake saved! Updating ledger...'
      saveSuccess.value = true
      emit('saved', { date: selectedDate.value, intake: formData.value })

      // Reload to get the saved record
      await loadData()

      // Recompute ledger to update debt and insights
      await recomputeLedger(user.value.id, { days: 60 })

      saveMessage.value = '✓ Intake saved and ledger updated!'

      setTimeout(() => {
        saveMessage.value = ''
      }, 2000)
    }
  } catch (error) {
    saveMessage.value = 'Error: ' + error.message
    saveSuccess.value = false
  } finally {
    saving.value = false
  }
}

async function clearIntake() {
  if (!user.value) return

  if (!confirm('Clear intake for this day?')) return

  saving.value = true

  try {
    const { error } = await deleteDayIntake(user.value.id, selectedDate.value)

    if (error) {
      saveMessage.value = 'Failed to clear: ' + error.message
      saveSuccess.value = false
    } else {
      saveMessage.value = '✓ Intake cleared! Updating ledger...'
      saveSuccess.value = true
      emit('cleared', { date: selectedDate.value })

      formData.value = {
        carbs_g: null,
        protein_g: null,
        notes: ''
      }
      existingIntake.value = null

      // Recompute ledger to update debt and insights
      await recomputeLedger(user.value.id, { days: 60 })

      saveMessage.value = '✓ Intake cleared and ledger updated!'

      setTimeout(() => {
        saveMessage.value = ''
      }, 2000)
    }
  } catch (error) {
    saveMessage.value = 'Error: ' + error.message
    saveSuccess.value = false
  } finally {
    saving.value = false
  }
}
</script>

