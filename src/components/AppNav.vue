<template>
  <nav class="bg-black text-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center">
          <router-link to="/" class="text-xl font-bold">FuelSync</router-link>
        </div>
        <div class="flex space-x-4">
          <router-link 
            to="/calendar" 
            class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
            :class="{ 'bg-gray-800': $route.path === '/calendar' }"
          >
            Calendar
          </router-link>
          <router-link 
            to="/import" 
            class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
            :class="{ 'bg-gray-800': $route.path === '/import' }"
          >
            Import
          </router-link>
          <router-link 
            to="/settings" 
            class="px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
            :class="{ 'bg-gray-800': $route.path === '/settings' }"
          >
            Settings
          </router-link>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
// Navigation component
</script>

