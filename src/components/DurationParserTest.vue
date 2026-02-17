<template>
  <div class="max-w-2xl mx-auto p-6">
    <h2 class="text-2xl font-bold mb-4">Duration Parser Test</h2>
    
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <p class="text-sm text-blue-800">
        Use this tool to test what your CSV duration values are being parsed as.
        This will help identify if the column mapping is correct.
      </p>
    </div>
    
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1">
          CSV Column Name
        </label>
        <input
          v-model="columnName"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="e.g., TimeTotalInHours, Duration, Time"
        />
        <p class="text-xs text-gray-500 mt-1">
          Enter the exact column name from your CSV
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">
          Test Duration Value
        </label>
        <input
          v-model="testValue"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="e.g., 01:30:00, 90, 1.5"
        />
        <p class="text-xs text-gray-500 mt-1">
          Enter a value from your CSV to see how it's parsed
        </p>
      </div>

      <button @click="testParse" class="btn-primary">
        Test Parse
      </button>
      
      <div v-if="result !== null" class="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 class="font-semibold mb-2">Result:</h3>
        <div class="space-y-2">
          <div>
            <span class="text-sm font-medium">Column Name:</span>
            <span class="ml-2 font-mono">{{ columnName || '(not specified)' }}</span>
          </div>
          <div>
            <span class="text-sm font-medium">Detected Unit:</span>
            <span class="ml-2 font-mono">{{ detectedUnit }}</span>
          </div>
          <div>
            <span class="text-sm font-medium">Input Value:</span>
            <span class="ml-2 font-mono">{{ testValue }}</span>
          </div>
          <div>
            <span class="text-sm font-medium">Parsed as:</span>
            <span class="ml-2 font-mono text-lg">{{ result }} minutes</span>
          </div>
          <div v-if="result !== null">
            <span class="text-sm font-medium">Equals:</span>
            <span class="ml-2">{{ formatMinutes(result) }}</span>
          </div>
        </div>
      </div>
      
      <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 class="font-semibold mb-2">Common Examples:</h3>
        <div class="space-y-3 text-sm">
          <div>
            <p class="font-medium mb-1">Time format (HH:MM:SS):</p>
            <div class="space-y-1 ml-3">
              <div class="flex justify-between">
                <span class="font-mono">01:30:00</span>
                <span class="text-gray-600">→ 90 minutes (1h 30m)</span>
              </div>
              <div class="flex justify-between">
                <span class="font-mono">00:45:00</span>
                <span class="text-gray-600">→ 45 minutes (45m)</span>
              </div>
            </div>
          </div>

          <div>
            <p class="font-medium mb-1">Hours (decimal) - column name contains "hour":</p>
            <div class="space-y-1 ml-3">
              <div class="flex justify-between">
                <span class="font-mono">1.5</span>
                <span class="text-gray-600">→ 90 minutes (1h 30m) ✓</span>
              </div>
              <div class="flex justify-between">
                <span class="font-mono">0.75</span>
                <span class="text-gray-600">→ 45 minutes (45m) ✓</span>
              </div>
              <div class="flex justify-between">
                <span class="font-mono">3.42</span>
                <span class="text-gray-600">→ 205 minutes (3h 25m) ✓</span>
              </div>
            </div>
          </div>

          <div>
            <p class="font-medium mb-1">Plain numbers (auto-detect):</p>
            <div class="space-y-1 ml-3">
              <div class="flex justify-between">
                <span class="font-mono">90</span>
                <span class="text-gray-600">→ 90 minutes (1h 30m)</span>
              </div>
              <div class="flex justify-between">
                <span class="font-mono">1.5</span>
                <span class="text-gray-600">→ 90 minutes (1h 30m) - auto-detected as hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 class="font-semibold text-yellow-800 mb-2">💡 Troubleshooting:</h3>
        <ul class="text-sm text-yellow-800 space-y-1 list-disc list-inside">
          <li>If you see "205 minutes" but the workout was only 3 minutes, you've mapped TSS to Duration</li>
          <li>If you see "3 minutes" but TSS shows as 45, you've swapped Duration and TSS</li>
          <li>Duration should be in HH:MM:SS format (e.g., 01:30:00) or plain minutes (e.g., 90)</li>
          <li>TSS is usually a number between 0-300 (e.g., 205, 65, 120)</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { parseDuration } from '../lib/parsers'

const columnName = ref('TimeTotalInHours')
const testValue = ref('')
const result = ref(null)
const detectedUnit = ref('')

function testParse() {
  // Detect unit based on column name (same logic as importProcessor)
  const colNameLower = columnName.value?.toLowerCase() || ''
  const isHoursColumn = colNameLower.includes('hour')
  const unit = isHoursColumn ? 'hours' : 'auto'

  detectedUnit.value = isHoursColumn ? 'hours (from column name)' : 'auto-detect'
  result.value = parseDuration(testValue.value, unit)
}

function formatMinutes(minutes) {
  if (minutes === null) return 'Invalid'

  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)

  if (hours > 0) {
    return `${hours}h ${mins}m`
  } else {
    return `${mins}m`
  }
}
</script>

