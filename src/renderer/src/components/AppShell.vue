<script setup lang="ts">
import { computed } from 'vue'
import type { AuthUser } from '../../../shared/auth'

const props = defineProps<{ user: AuthUser; busy: boolean; sessionError: string | null }>()
const emit = defineEmits<{ logout: []; retrySession: [] }>()
const displayName = computed(() => [props.user.lastName, props.user.firstName, props.user.middleName].filter(Boolean).join(' ') || props.user.login)
const rolesLabel = computed(() => props.user.roles.map((role) => role.name || role.code).join(', ') || 'Роли не назначены')
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="brand-mark" aria-hidden="true">W</div>
      <div>
        <p class="brand-name">Work People</p>
        <p class="brand-caption">Рабочее пространство компании</p>
      </div>
      <div class="account">
        <div class="account-copy"><p class="account-name">{{ displayName }}</p><p class="account-roles">{{ rolesLabel }}</p></div>
        <button class="logout-button" type="button" :disabled="busy" @click="emit('logout')">Выйти</button>
      </div>
    </header>
    <main class="main-content">
      <div class="page-intro">
        <h1 class="page-title">Рабочее пространство</h1>
        <p class="page-description">Состояние сервера и сервисов, необходимых для работы приложения.</p>
      </div>
      <div v-if="sessionError" class="session-warning" role="status">
        <span>{{ sessionError }}</span><button class="retry-button" type="button" @click="emit('retrySession')">Повторить</button>
      </div>
      <slot />
    </main>
    <footer class="app-footer">Work People</footer>
  </div>
</template>

<style scoped>
.app-shell { min-height: 100vh; display: flex; flex-direction: column; }
.app-header { display: flex; align-items: center; gap: 12px; padding: 24px 40px; border-bottom: 1px solid var(--border); background: var(--surface); }
.brand-mark { display: grid; place-items: center; width: 40px; height: 40px; background: var(--accent); color: white; border-radius: 10px; font-size: 23px; font-weight: 750; }
.brand-name { margin: 0; font-weight: 700; letter-spacing: -0.02em; }
.brand-caption { margin: 2px 0 0; font-size: 12px; color: var(--muted); }
.account { margin-left: auto; display: flex; align-items: center; gap: 20px; min-width: 0; }
.account-copy { text-align: right; min-width: 0; }
.account-name { margin: 0; font-size: 13px; font-weight: 600; overflow-wrap: anywhere; }
.account-roles { margin: 4px 0 0; font-size: 12px; color: var(--muted); overflow-wrap: anywhere; }
.logout-button, .retry-button { border: 1px solid #cbd8cf; border-radius: 7px; padding: 9px 13px; color: var(--accent); background: var(--surface); font: inherit; font-size: 12px; cursor: pointer; flex-shrink: 0; }
.logout-button:focus-visible, .retry-button:focus-visible { outline: 3px solid #a9d3bd; outline-offset: 3px; }
.logout-button:disabled { opacity: .6; cursor: wait; }
.session-warning { margin: 0 0 24px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px; border-radius: 8px; background: #fff4dc; color: #835a15; font-size: 13px; line-height: 1.6; }
.main-content { width: min(100% - 80px, 760px); margin: 56px auto; flex: 1; }
.page-title { margin: 12px 0; font-size: clamp(26px, 3.4vw, 34px); font-weight: 650; line-height: 1.2; letter-spacing: -0.035em; }
.page-description { margin: 0 0 32px; max-width: 560px; color: var(--muted); line-height: 1.65; }
.app-footer { padding: 20px 40px; color: var(--muted); font-size: 12px; }
@media (max-width: 760px) { .app-header { padding: 20px 24px; flex-wrap: wrap; } .brand-caption { display: none; } .main-content { width: calc(100% - 48px); margin: 36px auto; } .account { gap: 12px; } .app-footer { padding: 20px 24px; } }
</style>
