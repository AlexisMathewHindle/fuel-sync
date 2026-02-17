<template>
  <div class="bg-white border border-gray-200 rounded-lg p-6">
    <h3 class="text-xl font-semibold mb-4">Import History</h3>
    
    <div v-if="!user" class="text-gray-600">
      Please sign in to view import history.
    </div>
    
    <div v-else-if="loading" class="text-gray-600">
      Loading import history...
    </div>
    
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-4">
      <p class="text-red-800 font-medium">Error loading imports:</p>
      <p class="text-red-600 text-sm">{{ error }}</p>
    </div>
    
    <div v-else-if="!imports || imports.length === 0" class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
      <p class="text-gray-600 mb-2">No imports yet</p>
      <p class="text-sm text-gray-500 mb-4">Upload your first CSV to get started</p>
      <router-link to="/import" class="btn-primary inline-block">
        Import Workouts
      </router-link>
    </div>
    
    <div v-else class="space-y-3">
      <div
        v-for="importRecord in imports"
        :key="importRecord.id"
        class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-medium">{{ importRecord.filename }}</span>
              <span
                class="px-2 py-0.5 text-xs rounded-full"
                :class="getStatusBadgeClass(importRecord.status)"
              >
                {{ importRecord.status }}
              </span>
            </div>
            
            <div class="text-sm text-gray-600 space-y-1">
              <div class="flex items-center gap-4">
                <span>📅 {{ formatDate(importRecord.uploaded_at) }}</span>
                <span>📊 {{ importRecord.row_count || 0 }} rows</span>
                <span v-if="importRecord.source" class="text-gray-500">
                  Source: {{ importRecord.source }}
                </span>
              </div>
              
              <!-- Show errors if any -->
              <div v-if="hasErrors(importRecord)" class="mt-2">
                <button
                  @click="toggleErrors(importRecord.id)"
                  class="text-red-600 hover:text-red-700 text-xs font-medium"
                >
                  {{ expandedErrors[importRecord.id] ? '▼' : '▶' }}
                  {{ getErrorCount(importRecord) }} error(s)
                </button>
                
                <div v-if="expandedErrors[importRecord.id]" class="mt-2 bg-red-50 border border-red-200 rounded p-3">
                  <p class="text-xs font-medium text-red-800 mb-2">Sample Errors:</p>
                  <ul class="text-xs text-red-700 space-y-1 list-disc list-inside">
                    <li v-for="(error, idx) in getSampleErrors(importRecord)" :key="idx">
                      Row {{ error.row }}: {{ error.errors.join(', ') }}
                    </li>
                  </ul>
                  <p v-if="getErrorCount(importRecord) > 5" class="text-xs text-red-600 mt-2">
                    ... and {{ getErrorCount(importRecord) - 5 }} more errors
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Success indicator -->
          <div v-if="importRecord.status === 'completed'" class="text-green-600 text-2xl">
            ✓
          </div>
          <div v-else-if="importRecord.status === 'failed'" class="text-red-600 text-2xl">
            ✗
          </div>
          <div v-else-if="importRecord.status === 'processing'" class="text-blue-600">
            <div class="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
      
      <!-- Load more button if there are more imports -->
      <div v-if="imports.length >= limit" class="text-center pt-2">
        <button @click="loadMore" class="btn-secondary">
          Load More
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { user } from '../lib/auth'
import { getImports } from '../lib/database'

const imports = ref([])
const loading = ref(false)
const error = ref('')
const limit = ref(10)
const expandedErrors = ref({})

async function loadImports() {
  if (!user.value) return
  
  loading.value = true
  error.value = ''
  
  try {
    const { data, error: fetchError } = await getImports(user.value.id, { limit: limit.value })
    
    if (fetchError) {
      error.value = fetchError.message
    } else {
      imports.value = data || []
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

function loadMore() {
  limit.value += 10
  loadImports()
}

function getStatusBadgeClass(status) {
  const classes = {
    completed: 'bg-green-100 text-green-800',
    processing: 'bg-blue-100 text-blue-800',
    failed: 'bg-red-100 text-red-800',
    pending: 'bg-gray-100 text-gray-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function hasErrors(importRecord) {
  return importRecord.errors_json && Array.isArray(importRecord.errors_json) && importRecord.errors_json.length > 0
}

function getErrorCount(importRecord) {
  return importRecord.errors_json?.length || 0
}

function getSampleErrors(importRecord) {
  if (!importRecord.errors_json) return []
  return importRecord.errors_json.slice(0, 5) // Show first 5 errors
}

function toggleErrors(importId) {
  expandedErrors.value[importId] = !expandedErrors.value[importId]
}

// Load imports when component mounts or user changes
onMounted(() => {
  if (user.value) {
    loadImports()
  }
})

watch(user, (newUser) => {
  if (newUser) {
    loadImports()
  } else {
    imports.value = []
  }
})
</script>

