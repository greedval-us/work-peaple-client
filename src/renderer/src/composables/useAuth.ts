import { computed, onMounted, onUnmounted, readonly, shallowRef } from 'vue'
import type { AuthSession, LoginCredentials } from '../../../shared/auth'

export function useAuth() {
  const session = shallowRef<AuthSession | null>(null)
  const isInitializing = shallowRef(true)
  const isSigningIn = shallowRef(false)
  const isSigningOut = shallowRef(false)
  const loginError = shallowRef<string | null>(null)
  const notice = shallowRef<string | null>(null)
  const sessionError = shallowRef<string | null>(null)
  const user = computed(() => session.value?.user ?? null)
  let generation = 0
  let disposed = false
  let refreshing = false
  let expiryTimer: ReturnType<typeof setTimeout> | undefined

  function setSession(value: AuthSession | null): void {
    session.value = value
    if (expiryTimer) clearTimeout(expiryTimer)
    expiryTimer = undefined
    if (!value) return
    const checkExpiry = (): void => {
      const remaining = Date.parse(value.expiresAt) - Date.now()
      if (remaining > 0) {
        expiryTimer = setTimeout(checkExpiry, Math.min(remaining, 2_147_483_647))
        return
      }
      ++generation
      setSession(null)
      notice.value = 'Сеанс завершён. Войдите снова.'
      sessionError.value = null
      void window.workPeople.logout().catch(() => {})
    }
    checkExpiry()
  }

  async function refreshSession(): Promise<void> {
    if (disposed || refreshing || isSigningIn.value || isSigningOut.value) return
    refreshing = true
    const operation = generation
    try {
      const result = await window.workPeople.getCurrentUser()
      if (disposed || operation !== generation) return
      if (result.ok) {
        setSession(result.data)
        sessionError.value = null
      } else if (result.error.code === 'unauthenticated') {
        setSession(null)
        notice.value = result.error.message
        sessionError.value = null
      } else if (result.error.code !== 'cancelled') {
        if (session.value) sessionError.value = result.error.message
        else loginError.value = result.error.message
      }
    } catch {
      if (!disposed && operation === generation) {
        const message = 'Не удалось проверить сеанс. Повторите попытку.'
        if (session.value) sessionError.value = message
        else loginError.value = message
      }
    } finally {
      refreshing = false
      if (!disposed) isInitializing.value = false
    }
  }

  async function login(credentials: LoginCredentials): Promise<void> {
    if (disposed || isSigningIn.value || isSigningOut.value) return
    const operation = ++generation
    isSigningIn.value = true
    loginError.value = null
    notice.value = null
    try {
      const pending = window.workPeople.login(credentials)
      credentials = { login: '', password: '' }
      const result = await pending
      if (disposed || operation !== generation) return
      if (result.ok) {
        setSession(result.data)
        sessionError.value = null
      } else loginError.value = result.error.message
    } catch {
      if (!disposed && operation === generation) loginError.value = 'Не удалось выполнить вход. Попробуйте ещё раз.'
    } finally {
      if (!disposed) isSigningIn.value = false
    }
  }

  async function logout(): Promise<void> {
    if (disposed || isSigningOut.value) return
    const operation = ++generation
    isSigningOut.value = true
    setSession(null)
    sessionError.value = null
    loginError.value = null
    notice.value = null
    try {
      const result = await window.workPeople.logout()
      if (disposed || operation !== generation) return
      notice.value = result.ok ? 'Вы вышли из рабочего пространства.'
        : 'Вы вышли на этом устройстве. Сервер недоступен; сеанс на сервере завершится по сроку действия.'
    } catch {
      if (!disposed && operation === generation) notice.value = 'Вы вышли на этом устройстве. Не удалось подтвердить выход на сервере.'
    } finally {
      if (!disposed && operation === generation) isSigningOut.value = false
    }
  }

  function onFocus(): void { if (session.value) void refreshSession() }
  onMounted(() => {
    void refreshSession()
    window.addEventListener('focus', onFocus)
  })
  onUnmounted(() => {
    disposed = true
    ++generation
    if (expiryTimer) clearTimeout(expiryTimer)
    window.removeEventListener('focus', onFocus)
  })

  return {
    user, isInitializing: readonly(isInitializing), isSigningIn: readonly(isSigningIn),
    isSigningOut: readonly(isSigningOut), loginError: readonly(loginError),
    notice: readonly(notice), sessionError: readonly(sessionError), login, logout, refreshSession
  }
}
