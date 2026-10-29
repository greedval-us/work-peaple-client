<script setup lang="ts">
import AppShell from './components/AppShell.vue'
import ConnectionPanel from './components/connection/ConnectionPanel.vue'
import LoginForm from './components/auth/LoginForm.vue'
import { useAuth } from './composables/useAuth'

const { user, isInitializing, isSigningIn, isSigningOut, loginError, notice, sessionError, login, logout, refreshSession } = useAuth()
</script>

<template>
  <main v-if="isInitializing" class="startup-screen" role="status">Открываем Work People…</main>
  <AppShell v-else-if="user" :user="user" :busy="isSigningOut" :session-error="sessionError" @logout="logout" @retry-session="refreshSession">
    <ConnectionPanel />
  </AppShell>
  <LoginForm v-else :busy="isSigningIn || isSigningOut" :error="loginError" :notice="notice" @submit="login" />
</template>

<style scoped>
.startup-screen { min-height: 100vh; display: grid; place-items: center; color: var(--muted); font-size: 14px; }
</style>
