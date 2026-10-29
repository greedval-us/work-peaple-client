<script setup lang="ts">
import { computed } from 'vue'
import { useConnection, type ConnectionState } from '../../composables/useConnection'

const { state, snapshot, error, isLoading, checkConnection } = useConnection()
const stateCopy: Record<ConnectionState, { title: string; description: string; label: string }> = {
  loading: { title: 'Проверяем соединение', description: 'Ожидаем ответ сервера и проверяем доступность его сервисов.', label: 'Проверка' },
  ok: { title: 'Соединение установлено', description: 'Сервер работает. Все необходимые сервисы доступны.', label: 'Доступно' },
  degraded: { title: 'Сервер требует внимания', description: 'Соединение установлено, но часть сервисов недоступна.', label: 'Есть ограничения' },
  error: { title: 'Сервер недоступен', description: 'Не удалось получить состояние рабочего пространства.', label: 'Нет соединения' }
}
const copy = computed(() => stateCopy[state.value])
const dependencyRows = computed(() => snapshot.value ? [
  { name: 'PostgreSQL', state: snapshot.value.dependencies.postgres },
  { name: 'Redis', state: snapshot.value.dependencies.redis }
] : [])
const checkedAt = computed(() => snapshot.value
  ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(snapshot.value.checkedAt))
  : null)
</script>

<template>
  <section class="connection-panel" aria-labelledby="connection-title" :aria-busy="isLoading">
    <div class="panel-heading">
      <span class="status-badge" :class="`status-${state}`">
        <span class="status-dot" aria-hidden="true"></span>{{ copy.label }}
      </span>
      <span class="protocol-label">gRPC</span>
    </div>
    <div class="connection-copy" role="status" aria-live="polite">
      <h2 id="connection-title" class="connection-title">{{ copy.title }}</h2>
      <p class="connection-description">{{ error || copy.description }}</p>
    </div>
    <div v-if="snapshot && !isLoading" class="server-details">
      <div class="detail-row"><span>API</span><span class="detail-value">{{ snapshot.service }} · {{ snapshot.version }}</span></div>
      <div v-for="dependency in dependencyRows" :key="dependency.name" class="detail-row">
        <span>{{ dependency.name }}</span>
        <span class="detail-value" :class="{ 'dependency-down': dependency.state === 'down' }">{{ dependency.state === 'up' ? 'Доступен' : 'Недоступен' }}</span>
      </div>
      <p class="checked-at">Проверено: {{ checkedAt }}</p>
    </div>
    <div class="panel-actions">
      <button class="check-button" type="button" :disabled="isLoading" @click="checkConnection">
        {{ isLoading ? 'Проверяем…' : 'Проверить ещё раз' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.connection-panel { padding: 28px; border: 1px solid var(--border); border-radius: 16px; background: var(--surface); box-shadow: 0 8px 28px #182d2105; }
.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.status-badge { display: inline-flex; align-items: center; gap: 7px; padding: 6px 9px; border-radius: 6px; font-size: 12px; font-weight: 650; }
.status-loading { color: #4f655c; background: #edf1ef; }
.status-ok { color: #216b49; background: #eaf5ee; }
.status-degraded { color: #835a15; background: #fff4dc; }
.status-error { color: #a33c34; background: #fceeea; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.protocol-label { color: var(--muted); font-size: 12px; }
.connection-copy { margin: 26px 0; }
.connection-title { margin: 0 0 10px; font-size: 21px; font-weight: 650; letter-spacing: -0.02em; }
.connection-description { margin: 0; color: var(--muted); font-size: 14px; line-height: 1.65; }
.server-details { margin-bottom: 24px; border-top: 1px solid var(--border); }
.detail-row { display: flex; justify-content: space-between; gap: 20px; padding: 13px 0; border-bottom: 1px solid var(--border); font-size: 13px; color: var(--muted); }
.detail-value { color: var(--text); text-align: right; overflow-wrap: anywhere; }
.dependency-down { color: #a33c34; }
.checked-at { margin: 12px 0 0; color: var(--muted); font-size: 12px; }
.panel-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.check-button { padding: 11px 16px; border: 1px solid transparent; border-radius: 8px; background: var(--accent); color: white; font: inherit; font-size: 13px; font-weight: 650; cursor: pointer; }
.check-button:hover:not(:disabled) { background: #23563e; }
.check-button:focus-visible { outline: 3px solid #a9d3bd; outline-offset: 3px; }
.check-button:disabled { opacity: 0.6; cursor: wait; }
@media (prefers-reduced-motion: no-preference) { .status-loading .status-dot { animation: pulse 1.2s ease-in-out infinite; } @keyframes pulse { 50% { opacity: 0.3; } } }
</style>
