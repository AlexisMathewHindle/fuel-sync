<script setup>
import AppNav from './components/AppNav.vue'
</script>

<template>
  <div class="min-h-screen bg-white">
    <AppNav />
    <main>
      <router-view />
    </main>
  </div>
</template>

<style scoped>
/* App-level styles */
</style>
