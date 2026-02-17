<template>
  <div class="bg-white border border-gray-200 rounded-lg p-6">
    <h3 class="text-lg font-semibold mb-3">Glycogen Ledger</h3>
    
    <div v-if="!user" class="text-gray-600 text-sm">
      Please sign in to recompute the ledger.
    </div>
    
    <div v-else class="space-y-4">
      <p class="text-sm text-gray-600">
        The glycogen ledger calculates your daily glycogen debt, depletion, and generates personalized insights.
        Run this after importing workouts or if insights are missing.
      </p>
      
      <!-- Progress Display -->
      <div v-if="computing" class="space-y-2">
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-600">{{ progressStatus }}</span>
          <span class="font-medium">{{ progressPercent }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div 
            class="bg-black h-2 rounded-full transition-all duration-300"
            :style="{ width: progressPercent + '%' }"
          ></div>
        </div>
      </div>
      
      <!-- Result Message -->
      <div v-if="resultMessage" class="text-sm" :class="resultSuccess ? 'text-green-600' : 'text-red-600'">
        {{ resultMessage }}
      </div>
      
      <!-- Recompute Button -->
      <div class="flex items-center gap-3">
        <button
          @click="recompute"
          :disabled="computing || !migrationApplied"
          class="btn-primary"
          :class="{ 'opacity-50 cursor-not-allowed': computing || !migrationApplied }"
        >
          {{ computing ? 'Computing...' : 'Recompute Ledger (60 days)' }}
        </button>

        <div class="text-xs text-gray-500">
          {{ migrationApplied ? 'This may take 10-30 seconds' : 'Migration required first' }}
        </div>
      </div>
      
      <!-- Migration Check Warning -->
      <div v-if="!migrationApplied && migrationChecked" class="bg-red-50 border border-red-300 rounded-lg p-4 text-sm">
        <div class="font-bold text-red-900 mb-2">⚠️ Database Migrations Required!</div>
        <div class="text-red-800 mb-2">
          Required database columns don't exist yet. You need to run ALL migrations in order.
        </div>
        <div class="text-red-800 font-medium mb-1">
          Run these migrations in Supabase SQL Editor (in order):
        </div>
        <ol class="text-red-800 space-y-1 ml-4 list-decimal text-xs mb-2">
          <li><code class="bg-red-100 px-1 rounded">001_initial_schema.sql</code> - Creates base tables</li>
          <li><code class="bg-red-100 px-1 rounded">002_add_column_mapping.sql</code> - Adds column mapping</li>
          <li><code class="bg-red-100 px-1 rounded">003_add_workout_dedupe.sql</code> - Adds deduplication</li>
          <li><code class="bg-red-100 px-1 rounded">004_add_day_intake.sql</code> - Creates day_intake table</li>
          <li><code class="bg-red-100 px-1 rounded">005_add_glycogen_ledger.sql</code> - Adds glycogen ledger</li>
        </ol>
        <div class="text-red-800 font-medium text-xs">
          💡 Tip: You can run all migrations at once by copying all 5 files into one SQL query.
        </div>
      </div>

      <!-- Info Box -->
      <div v-else class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <div class="font-medium text-blue-900 mb-1">💡 When to run this:</div>
        <ul class="text-blue-800 space-y-1 ml-4 list-disc">
          <li>After your first CSV import</li>
          <li>If day cards show "No insights yet"</li>
          <li>If the Insights Panel is empty</li>
          <li>After manually editing old workout data</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { user } from '../lib/auth'
import { recomputeLedger } from '../lib/ledger'
import { supabase } from '../lib/supabase'

const computing = ref(false)
const progressStatus = ref('')
const progressPercent = ref(0)
const resultMessage = ref('')
const resultSuccess = ref(false)
const migrationApplied = ref(false)
const migrationChecked = ref(false)

// Check if migration has been applied
onMounted(async () => {
  if (!user.value) return

  try {
    // Try to query a day_summary with the new columns
    const { data, error } = await supabase
      .from('day_summaries')
      .select('debt_end_g, insight_headline')
      .limit(1)

    if (error) {
      console.error('Migration check failed:', error)
      migrationApplied.value = false
    } else {
      console.log('Migration check passed - columns exist')
      migrationApplied.value = true
    }

    migrationChecked.value = true
  } catch (error) {
    console.error('Migration check exception:', error)
    migrationApplied.value = false
    migrationChecked.value = true
  }
})

async function recompute() {
  if (!user.value || computing.value) return
  
  computing.value = true
  resultMessage.value = ''
  progressStatus.value = 'Starting...'
  progressPercent.value = 0
  
  try {
    const result = await recomputeLedger(user.value.id, {
      days: 60,
      onProgress: (current, total, status) => {
        progressStatus.value = status
        progressPercent.value = Math.round((current / total) * 100)
      }
    })
    
    if (result.success) {
      resultMessage.value = `✓ Successfully recomputed ${result.daysProcessed} days! Refresh the calendar to see insights.`
      resultSuccess.value = true
      
      // Auto-clear success message after 10 seconds
      setTimeout(() => {
        resultMessage.value = ''
      }, 10000)
    } else {
      resultMessage.value = `Failed to recompute: ${result.error}`
      resultSuccess.value = false
    }
  } catch (error) {
    resultMessage.value = `Error: ${error.message}`
    resultSuccess.value = false
  } finally {
    computing.value = false
    progressPercent.value = 100
  }
}
</script>

