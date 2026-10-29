<script setup lang="ts">
import { computed, onMounted, shallowRef, useTemplateRef } from 'vue'
import { parseLoginCredentials, type LoginCredentials } from '../../../../shared/auth'

const props = defineProps<{ busy: boolean; error: string | null; notice: string | null }>()
const emit = defineEmits<{ submit: [credentials: LoginCredentials] }>()
const login = shallowRef('')
const password = shallowRef('')
const validationError = shallowRef<string | null>(null)
const loginInput = useTemplateRef<HTMLInputElement>('loginInput')
const errorMessage = computed(() => validationError.value || props.error)

function submit(): void {
  if (props.busy) return
  const credentials = parseLoginCredentials({ login: login.value, password: password.value })
  if (!credentials) {
    validationError.value = 'Введите логин из 3–64 латинских букв, цифр, точек, дефисов или подчёркиваний и пароль.'
    return
  }
  validationError.value = null
  password.value = ''
  emit('submit', credentials)
}

onMounted(() => loginInput.value?.focus())
</script>

<template>
  <main class="login-screen">
    <aside class="welcome-panel">
      <div class="brand"><span class="brand-mark" aria-hidden="true">W</span><span>Work People</span></div>
      <div class="welcome-copy">
        <h1 class="welcome-title">Рабочее пространство<br />вашей компании</h1>
        <p class="welcome-description">Войдите с учётной записью, которую предоставил администратор.</p>
      </div>
    </aside>
    <section class="form-panel" aria-labelledby="login-title">
      <form class="login-form" :aria-busy="busy" @submit.prevent="submit">
        <h2 id="login-title" class="login-title">Вход в Work People</h2>
        <p class="login-description">Введите логин и пароль для продолжения.</p>
        <p v-if="notice" class="form-notice" role="status">{{ notice }}</p>
        <div class="form-field">
          <label class="field-label" for="login">Логин</label>
          <input id="login" ref="loginInput" v-model="login" class="field-input" name="username"
            type="text" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="64"
            :disabled="busy" :aria-invalid="Boolean(errorMessage)" :aria-describedby="errorMessage ? 'login-error' : undefined" required
            @input="validationError = null" />
        </div>
        <div class="form-field">
          <label class="field-label" for="password">Пароль</label>
          <input id="password" v-model="password" class="field-input" name="password" type="password"
            autocomplete="current-password" maxlength="256" :disabled="busy" :aria-invalid="Boolean(errorMessage)"
            :aria-describedby="errorMessage ? 'login-error' : undefined" required @input="validationError = null" />
        </div>
        <p v-if="errorMessage" id="login-error" class="form-error" role="alert">{{ errorMessage }}</p>
        <button class="login-button" type="submit" :disabled="busy">{{ busy ? 'Подождите…' : 'Войти' }}</button>
        <p class="access-note">Если войти не получается, обратитесь к администратору компании.</p>
      </form>
    </section>
  </main>
</template>

<style scoped>
.login-screen { min-height: 100vh; display: grid; grid-template-columns: minmax(300px, 44%) 1fr; background: var(--surface); }
.welcome-panel { display: flex; flex-direction: column; padding: 42px 40px 30px; background: #e7eee9; border-right: 1px solid #d6e2da; }
.brand { display: flex; align-items: center; gap: 12px; font-size: 19px; font-weight: 700; letter-spacing: -0.035em; }
.brand-mark { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 10px; color: white; background: var(--accent); font-size: 24px; }
.welcome-copy { margin: auto 0; padding: 64px 0; }
.welcome-title { margin: 0 0 22px; font-size: clamp(28px, 3.4vw, 39px); font-weight: 650; line-height: 1.2; letter-spacing: -0.045em; }
.welcome-description { margin: 0; max-width: 290px; color: #536b5d; font-size: 15px; line-height: 1.7; }
.form-panel { display: grid; align-items: center; justify-items: center; padding: 48px 40px; }
.login-form { width: min(100%, 360px); }
.login-title { margin: 0 0 10px; font-size: 26px; font-weight: 650; letter-spacing: -0.035em; }
.login-description { margin: 0 0 32px; color: var(--muted); font-size: 14px; line-height: 1.6; }
.form-field { margin-top: 20px; }
.field-label { display: block; margin-bottom: 8px; font-size: 13px; font-weight: 600; }
.field-input { width: 100%; min-height: 46px; padding: 11px 13px; border: 1px solid #cbd8cf; border-radius: 8px; background: white; color: var(--text); font: inherit; font-size: 15px; }
.field-input:focus { outline: 3px solid #c9e4d4; outline-offset: 1px; border-color: var(--accent); }
.field-input[aria-invalid="true"] { border-color: #b85b51; }
.field-input:disabled { background: #f3f5f4; }
.form-notice { margin: 0 0 24px; padding: 12px 14px; color: #315740; background: #edf4ef; border-radius: 8px; font-size: 13px; line-height: 1.6; }
.form-error { margin: 16px 0 0; color: #a33c34; font-size: 13px; line-height: 1.6; }
.login-button { width: 100%; margin-top: 28px; min-height: 46px; border: 0; border-radius: 8px; color: white; background: var(--accent); font: inherit; font-size: 14px; font-weight: 650; cursor: pointer; }
.login-button:hover:not(:disabled) { background: #23563e; }
.login-button:focus-visible { outline: 3px solid #a9d3bd; outline-offset: 3px; }
.login-button:disabled { opacity: .65; cursor: wait; }
.access-note { margin: 22px 0 0; color: var(--muted); font-size: 12px; line-height: 1.7; }
@media (max-width: 760px) { .login-screen { grid-template-columns: 1fr; } .welcome-panel { padding: 24px; border-right: 0; border-bottom: 1px solid #d6e2da; } .welcome-copy { padding: 24px 0 0; } .welcome-title { font-size: 26px; margin-bottom: 12px; } .welcome-description { max-width: none; } .form-panel { padding: 32px 24px; } }
</style>
