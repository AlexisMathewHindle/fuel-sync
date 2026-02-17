<template>
  <div class="bg-white border border-gray-200 rounded-lg p-6">
    <h3 class="text-xl font-semibold mb-4">Nutrition Settings</h3>
    
    <div v-if="!user" class="text-gray-600">
      Please sign in to edit settings.
    </div>
    
    <div v-else class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">
          Body Weight (kg)
        </label>
        <input
          v-model.number="formData.weight_kg"
          type="number"
          min="30"
          max="200"
          step="0.1"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="70"
        />
        <p class="text-xs text-gray-500 mt-1">Used to calculate nutrition targets</p>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-1">
          Protein Target (g/kg body weight)
        </label>
        <input
          v-model.number="formData.protein_g_per_kg"
          type="number"
          min="1.0"
          max="3.0"
          step="0.1"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="1.8"
        />
        <p class="text-xs text-gray-500 mt-1">Recommended: 1.6-2.2 for endurance athletes</p>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-1">
          Carb Factor
        </label>
        <input
          v-model.number="formData.carb_factor"
          type="number"
          min="0.5"
          max="2.0"
          step="0.1"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="1.0"
        />
        <p class="text-xs text-gray-500 mt-1">Multiplier for carb targets (1.0 = default, 1.2 = +20%)</p>
      </div>
      
      <div>
        <label class="block text-sm font-medium mb-1">
          Timezone
        </label>
        <input
          v-model="formData.timezone"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="UTC"
        />
        <p class="text-xs text-gray-500 mt-1">e.g., America/New_York, Europe/London, UTC</p>
      </div>
      
      <!-- Auto-recalculate option -->
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            v-model="autoRecalculate"
            type="checkbox"
            class="w-4 h-4 rounded border-gray-300"
          />
          <span class="text-sm font-medium text-blue-900">
            Automatically recalculate all days when saving settings
          </span>
        </label>
        <p class="text-xs text-blue-700 mt-1 ml-6">
          This will update nutrition targets for the last 40 days based on your new settings
        </p>
      </div>

      <div class="flex gap-3 pt-2">
        <button
          @click="saveSettings"
          :disabled="saving || recalculating || !isValid"
          class="btn-primary"
          :class="{ 'opacity-50 cursor-not-allowed': !isValid }"
        >
          {{ saving ? 'Saving...' : recalculating ? 'Recalculating...' : 'Save Settings' }}
        </button>

        <button
          v-if="settingsSaved && !autoRecalculate"
          @click="recalculateSummaries"
          :disabled="recalculating || saving"
          class="btn-secondary"
        >
          {{ recalculating ? 'Recalculating...' : 'Recalculate All Days' }}
        </button>
      </div>

      <div v-if="!isValid" class="text-xs text-red-600">
        Please ensure all values are within valid ranges
      </div>
      
      <!-- Feedback Messages -->
      <div v-if="saveMessage || recalcMessage" class="mt-3 space-y-2">
        <div v-if="saveMessage">
          <div :class="saveSuccess ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'" class="border rounded-lg p-3 text-sm font-medium">
            {{ saveMessage }}
          </div>
        </div>

        <div v-if="recalcMessage">
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <div class="flex items-center gap-2">
              <div v-if="recalculating" class="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span>{{ recalcMessage }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Help Text -->
      <div class="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
        <p class="font-medium mb-1">💡 How it works:</p>
        <ul class="list-disc list-inside space-y-1">
          <li><strong>Weight:</strong> Used to calculate protein targets (weight × protein factor)</li>
          <li><strong>Protein Factor:</strong> Grams of protein per kg body weight (1.6-2.2 recommended for athletes)</li>
          <li><strong>Carb Factor:</strong> Multiplier for carb targets (1.0 = default, 1.2 = +20% more carbs)</li>
          <li><strong>Auto-recalculate:</strong> Updates all past days' nutrition targets when you save</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { user } from '../lib/auth'
import { getUserSettings, upsertUserSettings } from '../lib/database'
import { summarizeDays } from '../lib/daySummarizer'
import { recomputeLedger } from '../lib/ledger'

const formData = ref({
  weight_kg: 70,
  protein_g_per_kg: 1.8,
  carb_factor: 1.0,
  timezone: 'UTC'
})

const isValid = computed(() => {
  return formData.value.weight_kg >= 30 &&
         formData.value.weight_kg <= 200 &&
         formData.value.protein_g_per_kg >= 1.0 &&
         formData.value.protein_g_per_kg <= 3.0 &&
         formData.value.carb_factor >= 0.5 &&
         formData.value.carb_factor <= 2.0
})

const saving = ref(false)
const settingsSaved = ref(false)
const saveMessage = ref('')
const saveSuccess = ref(false)

const recalculating = ref(false)
const recalcMessage = ref('')

const autoRecalculate = ref(true) // Default to auto-recalculate

// Load existing settings
onMounted(async () => {
  if (!user.value) return
  
  const { data } = await getUserSettings(user.value.id)
  if (data) {
    formData.value = {
      weight_kg: data.weight_kg || 70,
      protein_g_per_kg: data.protein_g_per_kg || 1.8,
      carb_factor: data.carb_factor || 1.0,
      timezone: data.timezone || 'UTC'
    }
  }
})

async function saveSettings() {
  if (!user.value) return

  saving.value = true
  saveMessage.value = ''
  recalcMessage.value = ''

  try {
    const { error } = await upsertUserSettings(user.value.id, formData.value)

    if (error) {
      saveMessage.value = 'Failed to save settings: ' + error.message
      saveSuccess.value = false
    } else {
      saveMessage.value = '✓ Settings saved successfully!'
      saveSuccess.value = true
      settingsSaved.value = true

      // Auto-recalculate if enabled
      if (autoRecalculate.value) {
        saveMessage.value = '✓ Settings saved! Recalculating targets...'
        await recalculateSummaries()
      } else {
        // Clear success message after 3 seconds
        setTimeout(() => {
          saveMessage.value = ''
        }, 3000)
      }
    }
  } catch (error) {
    saveMessage.value = 'Error: ' + error.message
    saveSuccess.value = false
  } finally {
    saving.value = false
  }
}

async function recalculateSummaries() {
  if (!user.value) return

  recalculating.value = true
  recalcMessage.value = 'Recalculating nutrition targets for all days...'

  try {
    const result = await summarizeDays(user.value.id, {
      days: 40,
      onProgress: (_current, _total, status) => {
        recalcMessage.value = status
      }
    })

    if (result.success) {
      // Also recompute glycogen ledger with new settings
      recalcMessage.value = 'Recomputing glycogen ledger...'

      const ledgerResult = await recomputeLedger(user.value.id, {
        days: 60,
        onProgress: (_current, _total, status) => {
          recalcMessage.value = status
        }
      })

      if (ledgerResult.success) {
        recalcMessage.value = `✓ Recalculated ${result.daysProcessed} days + ledger with new settings!`
        saveMessage.value = `✓ Settings saved and ${result.daysProcessed} days recalculated!`
      } else {
        recalcMessage.value = `✓ Recalculated ${result.daysProcessed} days (ledger update failed)`
      }

      setTimeout(() => {
        recalcMessage.value = ''
        if (autoRecalculate.value) {
          saveMessage.value = ''
        }
      }, 5000)
    } else {
      recalcMessage.value = 'Failed to recalculate: ' + result.error
    }
  } catch (error) {
    recalcMessage.value = 'Error: ' + error.message
  } finally {
    recalculating.value = false
  }
}
</script>

