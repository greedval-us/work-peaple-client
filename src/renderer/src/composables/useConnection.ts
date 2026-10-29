import { computed, onMounted, onUnmounted, readonly, shallowRef } from 'vue'
import type { HealthResult } from '../../../shared/health'

export type ConnectionState = 'loading' | 'ok' | 'degraded' | 'error'

export function useConnection() {
  const result = shallowRef<HealthResult | null>(null)
  const isLoading = shallowRef(false)
  let disposed = false

  const state = computed<ConnectionState>(() => {
    if (isLoading.value || result.value === null) return 'loading'
    return result.value.ok ? result.value.data.status : 'error'
  })
  const snapshot = computed(() => result.value?.ok ? result.value.data : null)
  const error = computed(() => result.value && !result.value.ok ? result.value.error.message : null)

  async function checkConnection(): Promise<void> {
    if (isLoading.value || disposed) return
    isLoading.value = true
    try {
      const response = await window.workPeople.getHealth()
      if (!disposed) result.value = response
    } catch {
      if (!disposed) result.value = { ok: false, error: { code: 'internal', message: 'Не удалось выполнить проверку соединения. Перезапустите приложение.' } }
    } finally {
      if (!disposed) isLoading.value = false
    }
  }

  onMounted(() => { void checkConnection() })
  onUnmounted(() => { disposed = true })

  return { state, snapshot, error, isLoading: readonly(isLoading), checkConnection }
}
