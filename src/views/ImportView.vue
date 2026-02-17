<template>
  <div class="max-w-6xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Import Workouts</h1>

    <!-- Step 1: File Upload -->
    <div v-if="!csvData" class="bg-gray-50 border border-gray-200 rounded-lg p-8">
      <h2 class="text-xl font-semibold mb-4">Upload CSV File</h2>
      <p class="text-gray-600 mb-4">
        Upload your TrainingPeaks Workout Summary CSV file to import your training data.
      </p>

      <div class="space-y-4">
        <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            type="file"
            ref="fileInput"
            @change="handleFileSelect"
            accept=".csv"
            class="hidden"
          />
          <button @click="$refs.fileInput.click()" class="btn-primary">
            Choose CSV File
          </button>
          <p class="text-sm text-gray-500 mt-2">or drag and drop</p>
        </div>

        <div v-if="fileName" class="text-sm text-gray-600">
          Selected: <span class="font-medium">{{ fileName }}</span>
        </div>

        <div v-if="parseError" class="bg-red-50 border border-red-200 rounded-lg p-4">
          <p class="text-red-800 font-medium">Error parsing CSV:</p>
          <p class="text-red-600 text-sm">{{ parseError }}</p>
        </div>
      </div>
    </div>

    <!-- Step 2: Preview & Column Mapping -->
    <div v-else class="space-y-6">
      <!-- File Info & Actions -->
      <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p class="font-medium">{{ fileName }}</p>
          <p class="text-sm text-gray-600">{{ csvData.length }} rows detected</p>
        </div>
        <button @click="resetUpload" class="btn-secondary">
          Upload Different File
        </button>
      </div>

      <!-- Validation Messages -->
      <div v-if="validationErrors.length > 0" class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-800 font-medium mb-2">⚠️ Validation Errors:</p>
        <ul class="list-disc list-inside text-red-600 text-sm space-y-1">
          <li v-for="(error, index) in validationErrors" :key="index">{{ error }}</li>
        </ul>
      </div>

      <div v-if="validationWarnings.length > 0" class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p class="text-yellow-800 font-medium mb-2">⚠️ Warnings:</p>
        <ul class="list-disc list-inside text-yellow-700 text-sm space-y-1">
          <li v-for="(warning, index) in validationWarnings" :key="index">{{ warning }}</li>
        </ul>
      </div>

      <div v-if="validationErrors.length === 0 && validationWarnings.length === 0" class="bg-green-50 border border-green-200 rounded-lg p-4">
        <p class="text-green-800">✓ All required columns detected. Ready to import!</p>
      </div>

      <!-- Column Mapping -->
      <div class="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-4">Column Mapping</h2>
        <p class="text-sm text-gray-600 mb-4">
          Map your CSV columns to the required fields. Auto-detected mappings are pre-selected.
        </p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div v-for="field in requiredFields" :key="field.key" class="space-y-1">
            <label class="block text-sm font-medium">
              {{ field.label }}
              <span v-if="field.required" class="text-red-600">*</span>
            </label>
            <select
              v-model="columnMapping[field.key]"
              @change="validateMapping"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            >
              <option value="">-- Select Column --</option>
              <option v-for="col in availableColumns" :key="col" :value="col">
                {{ col }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Preview Table -->
      <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div class="p-4 bg-gray-50 border-b border-gray-200">
          <h2 class="text-xl font-semibold">Preview (First 20 Rows)</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-100 border-b border-gray-200">
              <tr>
                <th class="px-4 py-2 text-left font-medium">#</th>
                <th
                  v-for="col in availableColumns"
                  :key="col"
                  class="px-4 py-2 text-left font-medium"
                  :class="{ 'bg-blue-50': isColumnMapped(col) }"
                >
                  {{ col }}
                  <span v-if="isColumnMapped(col)" class="text-blue-600 text-xs ml-1">
                    ({{ getMappedFieldLabel(col) }})
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, index) in previewRows"
                :key="index"
                class="border-b border-gray-100 hover:bg-gray-50"
              >
                <td class="px-4 py-2 text-gray-500">{{ index + 1 }}</td>
                <td
                  v-for="col in availableColumns"
                  :key="col"
                  class="px-4 py-2"
                  :class="{ 'bg-blue-50': isColumnMapped(col) }"
                >
                  {{ row[col] }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Import Progress -->
      <div v-if="importing" class="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 class="font-semibold mb-2">Import Progress</h3>
        <div class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span>{{ importProgress.status }}</span>
            <span class="font-medium">{{ importProgress.current }} / {{ importProgress.total }}</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: importProgressPercent + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Import Results -->
      <div v-if="importResults" class="bg-white border border-gray-200 rounded-lg p-6">
        <h3 class="text-xl font-semibold mb-4">Import Results</h3>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div class="bg-gray-50 rounded-lg p-4">
            <div class="text-2xl font-bold">{{ importResults.stats.total }}</div>
            <div class="text-sm text-gray-600">Total Rows</div>
          </div>
          <div class="bg-green-50 rounded-lg p-4">
            <div class="text-2xl font-bold text-green-600">{{ importResults.stats.successful }}</div>
            <div class="text-sm text-gray-600">Imported</div>
          </div>
          <div class="bg-yellow-50 rounded-lg p-4">
            <div class="text-2xl font-bold text-yellow-600">{{ importResults.stats.duplicates }}</div>
            <div class="text-sm text-gray-600">Duplicates</div>
          </div>
          <div class="bg-red-50 rounded-lg p-4">
            <div class="text-2xl font-bold text-red-600">{{ importResults.stats.failed }}</div>
            <div class="text-sm text-gray-600">Failed</div>
          </div>
        </div>

        <!-- Day Summary Results -->
        <div v-if="importResults.summaryResult" class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h4 class="font-semibold mb-2">✓ Day Summaries Computed</h4>
          <div class="text-sm text-gray-700 space-y-1">
            <p>{{ importResults.summaryResult.daysProcessed }} days summarized</p>
            <p v-if="importResults.summaryResult.dateRange">
              Date range: {{ importResults.summaryResult.dateRange.start }} to {{ importResults.summaryResult.dateRange.end }}
            </p>
          </div>
        </div>

        <!-- Error Details -->
        <div v-if="importResults.stats.errors.length > 0" class="bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex items-center justify-between mb-3">
            <p class="font-medium text-red-800">
              ⚠️ {{ importResults.stats.errors.length }} row(s) failed to import
            </p>
            <button
              v-if="importResults.stats.errors.length > 5"
              @click="showAllErrors = !showAllErrors"
              class="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              {{ showAllErrors ? 'Show Less' : 'Show All' }}
            </button>
          </div>

          <div class="space-y-2 max-h-64 overflow-y-auto">
            <div
              v-for="(error, index) in displayedErrors"
              :key="index"
              class="bg-white border border-red-200 rounded p-2"
            >
              <div class="flex items-start gap-2">
                <span class="text-red-600 font-mono text-xs">Row {{ error.row }}:</span>
                <div class="flex-1">
                  <ul class="text-sm text-red-700 list-disc list-inside">
                    <li v-for="(err, idx) in error.errors" :key="idx">{{ err }}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <p v-if="!showAllErrors && importResults.stats.errors.length > 5" class="text-xs text-red-600 mt-2">
            ... and {{ importResults.stats.errors.length - 5 }} more errors (click "Show All" to see them)
          </p>

          <div class="mt-3 pt-3 border-t border-red-200">
            <p class="text-xs text-red-700">
              <strong>Common issues:</strong> Invalid dates, missing required fields, or incorrect data formats.
              Check your CSV and try re-importing.
            </p>
          </div>
        </div>

        <div class="flex gap-4 mt-4">
          <button @click="viewWorkouts" class="btn-primary">
            View Imported Workouts
          </button>
          <button @click="resetUpload" class="btn-secondary">
            Import Another File
          </button>
        </div>
      </div>

      <!-- Action Buttons -->
      <div v-if="!importing && !importResults" class="flex gap-4">
        <button
          @click="proceedToImport"
          :disabled="validationErrors.length > 0 || importing"
          class="btn-primary"
          :class="{ 'opacity-50 cursor-not-allowed': validationErrors.length > 0 || importing }"
        >
          {{ importing ? 'Importing...' : 'Proceed to Import' }}
        </button>
        <button @click="resetUpload" class="btn-secondary" :disabled="importing">
          Cancel
        </button>
      </div>

      <!-- Import History -->
      <ImportHistory class="mt-6" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Papa from 'papaparse'
import { user } from '../lib/auth'
import { getUserSettings, upsertUserSettings, getDaySummaries } from '../lib/database'
import { processImport } from '../lib/importProcessor'
import { summarizeDays } from '../lib/daySummarizer'
import { recomputeLedger } from '../lib/ledger'
import { detectOngoingTrainingBlock } from '../lib/baselineDetection'
import ImportHistory from '../components/ImportHistory.vue'

const router = useRouter()

// File handling
const fileInput = ref(null)
const fileName = ref('')
const csvData = ref(null)
const parseError = ref('')
const importing = ref(false)

// Column mapping
const columnMapping = ref({
  date: '',
  sport: '',
  name: '',
  duration: '',
  distance: '',
  tss: '',
  if: '',
  avgHr: '',
  avgPower: '',
  calories: ''
})

// Required fields configuration
const requiredFields = [
  { key: 'date', label: 'Date', required: true },
  { key: 'sport', label: 'Sport/Activity Type', required: false },
  { key: 'name', label: 'Workout Name', required: false },
  { key: 'duration', label: 'Duration', required: true },
  { key: 'distance', label: 'Distance', required: false },
  { key: 'tss', label: 'TSS (Training Stress Score)', required: false },
  { key: 'if', label: 'IF (Intensity Factor)', required: false },
  { key: 'avgHr', label: 'Average Heart Rate', required: false },
  { key: 'avgPower', label: 'Average Power', required: false },
  { key: 'calories', label: 'Calories', required: false }
]

// Validation
const validationErrors = ref([])
const validationWarnings = ref([])

// Import progress and results
const importProgress = ref({
  current: 0,
  total: 0,
  status: ''
})
const importResults = ref(null)
const showAllErrors = ref(false)

// Computed properties
const displayedErrors = computed(() => {
  if (!importResults.value?.stats?.errors) return []
  if (showAllErrors.value) {
    return importResults.value.stats.errors
  }
  return importResults.value.stats.errors.slice(0, 5)
})
const availableColumns = computed(() => {
  if (!csvData.value || csvData.value.length === 0) return []
  return Object.keys(csvData.value[0])
})

const previewRows = computed(() => {
  if (!csvData.value) return []
  return csvData.value.slice(0, 20)
})

const importProgressPercent = computed(() => {
  if (importProgress.value.total === 0) return 0
  return Math.round((importProgress.value.current / importProgress.value.total) * 100)
})

// Auto-detection patterns for common TrainingPeaks column names
const columnPatterns = {
  date: ['date', 'workout date', 'workout_date', 'day', 'start date', 'start_date'],
  sport: ['sport', 'activity', 'type', 'workout type', 'workout_type', 'activity type', 'activity_type'],
  name: ['name', 'title', 'workout name', 'workout_name', 'description'],
  duration: ['duration', 'time', 'elapsed time', 'elapsed_time', 'moving time', 'moving_time', 'total time', 'total_time'],
  distance: ['distance', 'dist', 'total distance', 'total_distance'],
  tss: ['tss', 'training stress score', 'training_stress_score', 'stress'],
  if: ['if', 'intensity factor', 'intensity_factor', 'intensity'],
  avgHr: ['avg hr', 'avg_hr', 'average hr', 'average_hr', 'heart rate', 'hr', 'avg heart rate', 'average heart rate'],
  avgPower: ['avg power', 'avg_power', 'average power', 'average_power', 'power', 'avg watts', 'average watts'],
  calories: ['calories', 'cal', 'kcal', 'energy', 'kj']
}

// Load saved column mapping from user settings
onMounted(async () => {
  if (user.value) {
    const { data: settings } = await getUserSettings(user.value.id)
    if (settings && settings.column_mapping) {
      columnMapping.value = { ...columnMapping.value, ...settings.column_mapping }
    }
  }
})

// File selection handler
function handleFileSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  fileName.value = file.name
  parseError.value = ''

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      if (results.errors.length > 0) {
        parseError.value = results.errors[0].message
        return
      }

      csvData.value = results.data
      autoDetectColumns()
      validateMapping()
    },
    error: (error) => {
      parseError.value = error.message
    }
  })
}

// Auto-detect column mapping based on patterns
function autoDetectColumns() {
  const columns = availableColumns.value

  for (const [fieldKey, patterns] of Object.entries(columnPatterns)) {
    // Skip if already mapped from saved settings
    if (columnMapping.value[fieldKey]) continue

    // Find matching column
    const matchedColumn = columns.find(col => {
      const colLower = col.toLowerCase().trim()
      return patterns.some(pattern => colLower === pattern || colLower.includes(pattern))
    })

    if (matchedColumn) {
      columnMapping.value[fieldKey] = matchedColumn
    }
  }
}

// Validate column mapping
function validateMapping() {
  validationErrors.value = []
  validationWarnings.value = []

  // Check required fields
  const requiredFieldKeys = requiredFields.filter(f => f.required).map(f => f.key)

  for (const fieldKey of requiredFieldKeys) {
    if (!columnMapping.value[fieldKey]) {
      const field = requiredFields.find(f => f.key === fieldKey)
      validationErrors.value.push(`Required field "${field.label}" is not mapped`)
    }
  }

  // Check optional but recommended fields
  const recommendedFields = ['tss', 'calories']
  for (const fieldKey of recommendedFields) {
    if (!columnMapping.value[fieldKey]) {
      const field = requiredFields.find(f => f.key === fieldKey)
      validationWarnings.value.push(`Optional field "${field.label}" is not mapped - calculations may be less accurate`)
    }
  }
}

// Helper functions for UI
function isColumnMapped(columnName) {
  return Object.values(columnMapping.value).includes(columnName)
}

function getMappedFieldLabel(columnName) {
  const fieldKey = Object.keys(columnMapping.value).find(
    key => columnMapping.value[key] === columnName
  )
  if (!fieldKey) return ''
  const field = requiredFields.find(f => f.key === fieldKey)
  return field ? field.label : ''
}

// Reset upload
function resetUpload() {
  csvData.value = null
  fileName.value = ''
  parseError.value = ''
  validationErrors.value = []
  validationWarnings.value = []
  importResults.value = null
  importProgress.value = { current: 0, total: 0, status: '' }
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

// Proceed to import
async function proceedToImport() {
  if (validationErrors.value.length > 0) {
    alert('Please fix validation errors before importing')
    return
  }

  if (!user.value) {
    alert('Please sign in to import data')
    router.push('/settings')
    return
  }

  importing.value = true
  importResults.value = null

  try {
    // Save column mapping for future use
    await upsertUserSettings(user.value.id, {
      column_mapping: columnMapping.value
    })

    // Get user settings for timezone
    const { data: settings } = await getUserSettings(user.value.id)
    const timezone = settings?.timezone || 'UTC'

    // Process the import
    const result = await processImport({
      userId: user.value.id,
      csvData: csvData.value,
      columnMapping: columnMapping.value,
      fileName: fileName.value,
      timezone,
      onProgress: (current, total, status) => {
        importProgress.value = { current, total, status }
      }
    })

    if (result.success) {
      // Automatically summarize days after successful import
      importProgress.value = { current: 0, total: 100, status: 'Computing day summaries...' }

      const summaryResult = await summarizeDays(user.value.id, {
        days: 40,
        onProgress: (current, total, status) => {
          importProgress.value = { current, total, status }
        }
      })

      // Recompute glycogen ledger after import
      importProgress.value = { current: 0, total: 100, status: 'Computing glycogen ledger...' }

      const ledgerResult = await recomputeLedger(user.value.id, {
        days: 60,
        onProgress: (current, total, status) => {
          importProgress.value = { current, total, status }
        }
      })

      // Run baseline detection after ledger recompute
      try {
        const { data: settings } = await getUserSettings(user.value.id)
        // Only detect if baseline is still default (0) and not dismissed
        if ((!settings?.starting_debt_g || settings.starting_debt_g === 0) && !settings?.baseline_prompt_dismissed) {
          const endDate = new Date()
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - 60)
          const { data: summaries } = await getDaySummaries(user.value.id, {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          })
          const chronological = (summaries || [])
            .filter(s => s.total_tss > 0 || s.depletion_total_g > 0)
            .sort((a, b) => a.date.localeCompare(b.date))
          const detection = detectOngoingTrainingBlock(chronological)
          if (detection.shouldPrompt) {
            // Store flag for CalendarView to pick up
            localStorage.setItem('fuelSync_baselineDetected', 'true')
          }
        }
      } catch (detectionErr) {
        console.warn('Baseline detection failed (non-fatal):', detectionErr)
      }

      // Add summary info to results
      result.summaryResult = summaryResult
      result.ledgerResult = ledgerResult
      importResults.value = result
    } else {
      alert('Import failed: ' + result.error)
    }

  } catch (error) {
    console.error('Import error:', error)
    alert('Error during import: ' + error.message)
  } finally {
    importing.value = false
  }
}

// Navigate to calendar to view workouts
function viewWorkouts() {
  router.push('/calendar')
}
</script>

