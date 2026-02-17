<template>
  <div class="max-w-md mx-auto mt-16 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
    <h2 class="text-2xl font-bold mb-6 text-center">Sign In to FuelSync</h2>
    
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
          placeholder="your@email.com"
        />
      </div>
      
      <button
        type="submit"
        :disabled="isLoading"
        class="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ isLoading ? 'Sending...' : 'Send Magic Link' }}
      </button>
    </form>
    
    <div v-if="message" class="mt-4 p-3 rounded-md" :class="messageClass">
      {{ message }}
    </div>
    
    <p class="mt-4 text-sm text-gray-600 text-center">
      We'll send you a magic link to sign in without a password.
    </p>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { signInWithMagicLink } from '../lib/auth'

const email = ref('')
const message = ref('')
const isLoading = ref(false)
const isSuccess = ref(false)

const messageClass = computed(() => {
  return isSuccess.value
    ? 'bg-green-50 text-green-800 border border-green-200'
    : 'bg-red-50 text-red-800 border border-red-200'
})

async function handleSubmit() {
  isLoading.value = true
  message.value = ''
  
  const result = await signInWithMagicLink(email.value)
  
  isSuccess.value = result.success
  message.value = result.message
  isLoading.value = false
  
  if (result.success) {
    email.value = ''
  }
}
</script>

