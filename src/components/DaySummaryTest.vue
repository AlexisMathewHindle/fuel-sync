<template>
  <div class="max-w-4xl mx-auto p-6">
    <h2 class="text-2xl font-bold mb-4">Day Summary Calculator</h2>
    
    <div v-if="!user" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <p class="text-yellow-800">Please sign in to compute day summaries.</p>
    </div>
    
    <div v-else class="space-y-4">
      <!-- Controls -->
      <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 class="font-semibold mb-2">Compute Day Summaries</h3>
        <p class="text-sm text-gray-600 mb-4">
          This will group your workouts by day and calculate daily totals (duration, TSS, calories, sport mix).
        </p>
        
        <div class="flex items-center gap-4">
          <div>
            <label class="block text-sm font-medium mb-1">Days to summarize:</label>
            <input
              v-model.number="daysToSummarize"
              type="number"
              min="1"
              max="365"
              class="px-3 py-2 border border-gray-300 rounded-lg w-24"
            />
          </div>
          
          <button
            @click="runSummarization"
            :disabled="processing"
            class="btn-primary mt-5"
          >
            {{ processing ? 'Processing...' : 'Compute Summaries' }}
          </button>
        </div>
      </div>
      
      <!-- Progress -->
      <div v-if="processing" class="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span>{{ progress.status }}</span>
            <span class="font-medium">{{ progress.current }}%</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: progress.current + '%' }"
            ></div>
          </div>
        </div>
      </div>
      
      <!-- Results -->
      <div v-if="results" class="bg-white border border-gray-200 rounded-lg p-6">
        <h3 class="text-xl font-semibold mb-4">Results</h3>
        
        <div v-if="results.success" class="space-y-3">
          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <p class="text-green-800 font-medium">✓ Summarization Complete</p>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="text-2xl font-bold">{{ results.daysProcessed }}</div>
              <div class="text-sm text-gray-600">Days Summarized</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-4">
              <div class="text-2xl font-bold">{{ results.workoutsProcessed }}</div>
              <div class="text-sm text-gray-600">Workouts Processed</div>
            </div>
          </div>
          
          <div v-if="results.dateRange" class="text-sm text-gray-600">
            <p><strong>Date Range:</strong> {{ results.dateRange.start }} to {{ results.dateRange.end }}</p>
          </div>
          
          <div v-if="results.errors && results.errors.length > 0" class="bg-red-50 border border-red-200 rounded-lg p-4">
            <p class="font-medium text-red-800 mb-2">Errors:</p>
            <div class="space-y-1 text-sm text-red-600">
              <div v-for="(error, index) in results.errors" :key="index">
                {{ error.date }}: {{ error.error }}
              </div>
            </div>
          </div>
        </div>
        
        <div v-else class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-red-800 font-medium">Error:</p>
          <p class="text-red-600 text-sm">{{ results.error }}</p>
        </div>
        
        <div class="mt-4">
          <button @click="viewSummaries" class="btn-primary">
            View Day Summaries in Database
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { user } from '../lib/auth'
import { summarizeDays } from '../lib/daySummarizer'

const daysToSummarize = ref(40)
const processing = ref(false)
const progress = ref({ current: 0, total: 100, status: '' })
const results = ref(null)

async function runSummarization() {
  if (!user.value) {
    alert('Please sign in first')
    return
  }
  
  processing.value = true
  results.value = null
  progress.value = { current: 0, total: 100, status: 'Starting...' }
  
  try {
    const result = await summarizeDays(user.value.id, {
      days: daysToSummarize.value,
      onProgress: (current, total, status) => {
        progress.value = { current, total, status }
      }
    })
    
    results.value = result
  } catch (error) {
    console.error('Summarization error:', error)
    results.value = {
      success: false,
      error: error.message
    }
  } finally {
    processing.value = false
  }
}

function viewSummaries() {
  alert('Open Supabase Dashboard → Table Editor → day_summaries to view the computed summaries')
}
</script>

