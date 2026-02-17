<template>
  <div
    v-if="visible"
    class="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-4"
  >
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1">
        <h4 class="font-semibold text-sm mb-1">Ongoing training block detected</h4>
        <p class="text-sm text-gray-600 leading-relaxed">
          Your first few days show significant training load. Starting with a small glycogen
          deficit may give more accurate targets than starting from zero.
        </p>
        <p v-if="reason" class="text-xs text-gray-500 mt-1">{{ reason }}</p>
      </div>
    </div>

    <div class="flex items-center gap-3 mt-4">
      <button
        @click="$emit('set-baseline')"
        :disabled="loading"
        class="px-4 py-2 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
      >
        {{ loading ? 'Updating...' : 'Set baseline: Training recently' }}
      </button>
      <button
        @click="$emit('keep-fresh')"
        :disabled="loading"
        class="px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        Keep start fresh
      </button>
      <button
        @click="$emit('dismiss')"
        :disabled="loading"
        class="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-auto"
      >
        Don't ask again
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  reason: {
    type: String,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['set-baseline', 'keep-fresh', 'dismiss'])
</script>

