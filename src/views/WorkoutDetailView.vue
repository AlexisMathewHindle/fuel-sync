<template>
  <div class="max-w-4xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Workout Details</h1>
    <div class="bg-gray-50 border border-gray-200 rounded-lg p-8">
      <p class="text-gray-600">Workout ID: {{ workoutId }}</p>
      <p class="text-gray-600 mt-4">Detailed workout information and nutrition recommendations will appear here</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const workoutId = computed(() => route.params.id)
</script>

