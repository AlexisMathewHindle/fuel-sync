<template>
  <div class="max-w-4xl mx-auto p-6">
    <h2 class="text-2xl font-bold mb-4">Database Connection Test</h2>
    
    <div v-if="!user" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <p class="text-yellow-800">Please sign in to test database operations.</p>
    </div>
    
    <div v-else class="space-y-4">
      <!-- Test Results -->
      <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 class="font-semibold mb-2">Test Results</h3>
        <div v-if="loading" class="text-gray-600">Running tests...</div>
        <div v-else-if="results.length > 0" class="space-y-2">
          <div
            v-for="(result, index) in results"
            :key="index"
            class="flex items-start gap-2"
          >
            <span v-if="result.success" class="text-green-600">✓</span>
            <span v-else class="text-red-600">✗</span>
            <div class="flex-1">
              <div class="font-medium">{{ result.test }}</div>
              <div v-if="result.message" class="text-sm text-gray-600">
                {{ result.message }}
              </div>
              <div v-if="result.error" class="text-sm text-red-600">
                Error: {{ result.error }}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="flex gap-2">
        <button @click="runTests" :disabled="loading" class="btn-primary">
          {{ loading ? 'Running...' : 'Run Database Tests' }}
        </button>
        <button @click="clearResults" class="btn-secondary">
          Clear Results
        </button>
      </div>

      <!-- Danger Zone -->
      <div class="border-t pt-4 mt-4">
        <h3 class="font-semibold text-red-600 mb-3">⚠️ Danger Zone</h3>
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-sm text-red-800 mb-3">
            Use these actions to clear your data before re-importing with correct column mappings.
            <strong>This cannot be undone!</strong>
          </p>
          <div class="flex gap-2 flex-wrap">
            <button
              @click="clearAllWorkouts"
              :disabled="clearing"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {{ clearing ? 'Clearing...' : 'Clear All Workouts' }}
            </button>
            <button
              @click="clearAllDaySummaries"
              :disabled="clearing"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {{ clearing ? 'Clearing...' : 'Clear All Day Summaries' }}
            </button>
            <button
              @click="clearAllIntakes"
              :disabled="clearing"
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {{ clearing ? 'Clearing...' : 'Clear All Intakes' }}
            </button>
            <button
              @click="clearAllData"
              :disabled="clearing"
              class="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 disabled:opacity-50"
            >
              {{ clearing ? 'Clearing...' : 'Clear Everything' }}
            </button>
          </div>
          <div v-if="clearMessage" class="mt-3 text-sm font-medium" :class="clearSuccess ? 'text-green-700' : 'text-red-700'">
            {{ clearMessage }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { user } from '../lib/auth'
import {
  getUserSettings,
  upsertUserSettings,
  createWorkout,
  getWorkouts,
  deleteWorkout,
  upsertDaySummary,
  getDaySummaries,
  getDayIntakes,
  deleteDayIntake
} from '../lib/database'
import { supabase } from '../lib/supabase'

const loading = ref(false)
const results = ref([])
const clearing = ref(false)
const clearMessage = ref('')
const clearSuccess = ref(false)

function addResult(test, success, message = '', error = null) {
  results.value.push({ test, success, message, error })
}

async function runTests() {
  if (!user.value) {
    alert('Please sign in first')
    return
  }
  
  loading.value = true
  results.value = []
  
  const userId = user.value.id
  
  try {
    // Test 1: User Settings
    addResult('Fetching user settings', true, 'Attempting to fetch...')
    const { data: settings, error: settingsError } = await getUserSettings(userId)
    
    if (settingsError) {
      addResult('User settings fetch', false, '', settingsError.message)
    } else {
      addResult('User settings fetch', true, settings ? 'Settings found' : 'No settings yet')
    }
    
    // Test 2: Create/Update User Settings
    const { data: newSettings, error: upsertError } = await upsertUserSettings(userId, {
      weight_kg: 70.0,
      protein_g_per_kg: 1.6
    })
    
    if (upsertError) {
      addResult('Upsert user settings', false, '', upsertError.message)
    } else {
      addResult('Upsert user settings', true, `Weight: ${newSettings.weight_kg}kg`)
    }
    
    // Test 3: Create a test workout
    const testWorkout = {
      start_date: new Date().toISOString(),
      sport: 'run',
      name: 'Test Run',
      duration_min: 45,
      tss: 65,
      calories: 450
    }
    
    const { data: workout, error: workoutError } = await createWorkout(userId, testWorkout)
    
    if (workoutError) {
      addResult('Create workout', false, '', workoutError.message)
    } else {
      addResult('Create workout', true, `Created: ${workout.name}`)
      
      // Test 4: Fetch workouts
      const { data: workouts, error: fetchError } = await getWorkouts(userId, { limit: 10 })
      
      if (fetchError) {
        addResult('Fetch workouts', false, '', fetchError.message)
      } else {
        addResult('Fetch workouts', true, `Found ${workouts.length} workout(s)`)
      }
      
      // Test 5: Create day summary
      const today = new Date().toISOString().split('T')[0]
      const { data: summary, error: summaryError } = await upsertDaySummary(userId, today, {
        total_duration_min: 45,
        total_tss: 65,
        total_calories: 450,
        carb_target_g: 300,
        protein_target_g: 120
      })
      
      if (summaryError) {
        addResult('Create day summary', false, '', summaryError.message)
      } else {
        addResult('Create day summary', true, `Summary for ${summary.date}`)
      }
      
      // Test 6: Fetch day summaries
      const { data: summaries, error: summariesError } = await getDaySummaries(userId, { limit: 7 })
      
      if (summariesError) {
        addResult('Fetch day summaries', false, '', summariesError.message)
      } else {
        addResult('Fetch day summaries', true, `Found ${summaries.length} day(s)`)
      }
      
      // Test 7: Clean up - delete test workout
      const { error: deleteError } = await deleteWorkout(workout.id)
      
      if (deleteError) {
        addResult('Delete test workout', false, '', deleteError.message)
      } else {
        addResult('Delete test workout', true, 'Cleanup successful')
      }
    }
    
  } catch (err) {
    addResult('Unexpected error', false, '', err.message)
  } finally {
    loading.value = false
  }
}

function clearResults() {
  results.value = []
}

async function clearAllWorkouts() {
  if (!user.value) return

  if (!confirm('⚠️ Delete ALL workouts? This cannot be undone!')) return

  clearing.value = true
  clearMessage.value = ''

  try {
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('user_id', user.value.id)

    if (error) {
      clearMessage.value = 'Error: ' + error.message
      clearSuccess.value = false
    } else {
      clearMessage.value = '✓ All workouts deleted successfully!'
      clearSuccess.value = true
      setTimeout(() => { clearMessage.value = '' }, 5000)
    }
  } catch (error) {
    clearMessage.value = 'Error: ' + error.message
    clearSuccess.value = false
  } finally {
    clearing.value = false
  }
}

async function clearAllDaySummaries() {
  if (!user.value) return

  if (!confirm('⚠️ Delete ALL day summaries? This cannot be undone!')) return

  clearing.value = true
  clearMessage.value = ''

  try {
    const { error } = await supabase
      .from('day_summaries')
      .delete()
      .eq('user_id', user.value.id)

    if (error) {
      clearMessage.value = 'Error: ' + error.message
      clearSuccess.value = false
    } else {
      clearMessage.value = '✓ All day summaries deleted successfully!'
      clearSuccess.value = true
      setTimeout(() => { clearMessage.value = '' }, 5000)
    }
  } catch (error) {
    clearMessage.value = 'Error: ' + error.message
    clearSuccess.value = false
  } finally {
    clearing.value = false
  }
}

async function clearAllIntakes() {
  if (!user.value) return

  if (!confirm('⚠️ Delete ALL intake logs? This cannot be undone!')) return

  clearing.value = true
  clearMessage.value = ''

  try {
    const { error } = await supabase
      .from('day_intake')
      .delete()
      .eq('user_id', user.value.id)

    if (error) {
      clearMessage.value = 'Error: ' + error.message
      clearSuccess.value = false
    } else {
      clearMessage.value = '✓ All intake logs deleted successfully!'
      clearSuccess.value = true
      setTimeout(() => { clearMessage.value = '' }, 5000)
    }
  } catch (error) {
    clearMessage.value = 'Error: ' + error.message
    clearSuccess.value = false
  } finally {
    clearing.value = false
  }
}

async function clearAllData() {
  if (!user.value) return

  if (!confirm('⚠️⚠️⚠️ Delete EVERYTHING (workouts, summaries, intakes)? This cannot be undone!')) return

  clearing.value = true
  clearMessage.value = 'Deleting all data...'

  try {
    // Delete in order: intakes, summaries, workouts
    const { error: intakeError } = await supabase
      .from('day_intake')
      .delete()
      .eq('user_id', user.value.id)

    if (intakeError) throw intakeError

    const { error: summaryError } = await supabase
      .from('day_summaries')
      .delete()
      .eq('user_id', user.value.id)

    if (summaryError) throw summaryError

    const { error: workoutError } = await supabase
      .from('workouts')
      .delete()
      .eq('user_id', user.value.id)

    if (workoutError) throw workoutError

    clearMessage.value = '✓ All data deleted successfully! You can now re-import with correct mappings.'
    clearSuccess.value = true
    setTimeout(() => { clearMessage.value = '' }, 7000)
  } catch (error) {
    clearMessage.value = 'Error: ' + error.message
    clearSuccess.value = false
  } finally {
    clearing.value = false
  }
}
</script>

