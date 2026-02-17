<template>
  <div class="max-w-4xl mx-auto p-6">
    <h1 class="text-3xl font-bold mb-6">Settings</h1>

    <div v-if="!isAuthenticated()" class="bg-gray-50 border border-gray-200 rounded-lg p-8">
      <LoginForm />
    </div>

    <div v-else class="space-y-6">
      <div class="bg-gray-50 border border-gray-200 rounded-lg p-8">
        <div class="space-y-4">
          <div>
            <h2 class="text-xl font-semibold mb-2">Profile</h2>
            <p class="text-gray-600">Email: {{ user?.email }}</p>
            <p class="text-gray-600 text-sm mt-1">User ID: {{ user?.id }}</p>
          </div>
          <div class="border-t pt-4">
            <button @click="handleSignOut" class="btn-secondary">
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <!-- User Settings Form -->
      <UserSettingsForm />

      <!-- Baseline Settings -->
      <BaselineSettings />

      <!-- Ledger Recompute Button -->
      <LedgerRecomputeButton />

      <!-- Fueling Engine Test -->
      <FuelingEngineTest />

      <!-- Intake Logger -->
      <IntakeLogger />

      <!-- Alignment Score Test -->
      <AlignmentScoreTest />

      <!-- Duration Parser Test -->
      <!-- <DurationParserTest /> -->

      <!-- Database Test Component -->
      <DatabaseTest />

      <!-- Day Summary Test Component -->
      <DaySummaryTest />
    </div>
  </div>
</template>

<script setup>
import { user, isAuthenticated, signOut } from '../lib/auth'
import LoginForm from '../components/LoginForm.vue'
import UserSettingsForm from '../components/UserSettingsForm.vue'
import BaselineSettings from '../components/BaselineSettings.vue'
import LedgerRecomputeButton from '../components/LedgerRecomputeButton.vue'
import FuelingEngineTest from '../components/FuelingEngineTest.vue'
import IntakeLogger from '../components/IntakeLogger.vue'
import AlignmentScoreTest from '../components/AlignmentScoreTest.vue'
import DurationParserTest from '../components/DurationParserTest.vue'
import DatabaseTest from '../components/DatabaseTest.vue'
import DaySummaryTest from '../components/DaySummaryTest.vue'
import { useRouter } from 'vue-router'

const router = useRouter()

async function handleSignOut() {
  const result = await signOut()
  if (result.success) {
    router.push('/settings')
  }
}
</script>

