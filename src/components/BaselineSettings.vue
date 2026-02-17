<template>
  <div class="bg-white border border-gray-200 rounded-lg p-6">
    <h3 class="text-lg font-semibold mb-3">Glycogen Baseline</h3>

    <div v-if="!user" class="text-gray-600 text-sm">
      Please sign in to manage baseline.
    </div>

    <div v-else class="space-y-4">
      <p class="text-sm text-gray-600">
        The baseline sets your starting glycogen debt when the ledger begins.
        Choose "Training recently" if you imported data mid-training block.
      </p>

      <!-- Current Baseline Display -->
      <div class="bg-gray-50 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-sm font-medium">Current baseline:</span>
            <span class="ml-2 text-sm" :class="currentBaseline > 0 ? 'text-yellow-700' : 'text-green-700'">
              {{ currentBaseline > 0 ? `Training recently (${currentBaseline}g debt)` : 'Start fresh (0g debt)' }}
            </span>
          </div>
          <span v-if="baselineSetAt" class="text-xs text-gray-400">
            Set {{ formatDate(baselineSetAt) }}
          </span>
        </div>
      </div>

      <!-- Baseline Actions -->
      <div class="flex items-center gap-3">
        <button
          @click="setBaseline(250)"
          :disabled="updating || currentBaseline === 250"
          class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
          :class="currentBaseline === 250
            ? 'bg-black text-white cursor-default'
            : 'bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50'"
        >
          Training recently (250g)
        </button>
        <button
          @click="setBaseline(0)"
          :disabled="updating || currentBaseline === 0"
          class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
          :class="currentBaseline === 0
            ? 'bg-black text-white cursor-default'
            : 'bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50'"
        >
          Start fresh (0g)
        </button>
      </div>

      <!-- Status Message -->
      <div v-if="statusMessage" class="text-sm" :class="statusSuccess ? 'text-green-600' : 'text-red-600'">
        {{ statusMessage }}
      </div>

      <!-- Updating Indicator -->
      <div v-if="updating" class="flex items-center gap-2 text-sm text-gray-600">
        <div class="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full"></div>
        <span>Updating baseline and recomputing ledger...</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { user } from '../lib/auth'
import { getUserSettings, upsertUserSettings } from '../lib/database'
import { recomputeLedger } from '../lib/ledger'

const currentBaseline = ref(0)
const baselineSetAt = ref(null)
const updating = ref(false)
const statusMessage = ref('')
const statusSuccess = ref(false)

onMounted(async () => {
  if (!user.value) return
  const { data } = await getUserSettings(user.value.id)
  if (data) {
    currentBaseline.value = data.starting_debt_g || 0
    baselineSetAt.value = data.baseline_set_at || null
  }
})

async function setBaseline(debtG) {
  if (!user.value || updating.value) return

  updating.value = true
  statusMessage.value = ''

  try {
    await upsertUserSettings(user.value.id, {
      starting_debt_g: debtG,
      baseline_prompt_dismissed: debtG === 0,
      baseline_set_at: new Date().toISOString()
    })

    // Recompute ledger with new baseline
    const result = await recomputeLedger(user.value.id, { days: 60 })

    currentBaseline.value = debtG
    baselineSetAt.value = new Date().toISOString()

    if (result.success) {
      statusMessage.value = `✓ Baseline set to ${debtG}g and ledger recomputed (${result.daysProcessed} days)`
      statusSuccess.value = true
    } else {
      statusMessage.value = `Baseline saved but ledger recompute failed: ${result.error}`
      statusSuccess.value = false
    }

    setTimeout(() => { statusMessage.value = '' }, 8000)
  } catch (err) {
    statusMessage.value = 'Error: ' + err.message
    statusSuccess.value = false
  } finally {
    updating.value = false
  }
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

