export interface HealthSnapshot {
  status: 'ok' | 'degraded'
  service: string
  version: string
  checkedAt: string
  dependencies: {
    postgres: 'up' | 'down'
    redis: 'up' | 'down'
  }
}

export type HealthErrorCode = 'timeout' | 'unavailable' | 'invalid_response' | 'forbidden' | 'internal'

export type HealthResult =
  | { ok: true; data: HealthSnapshot }
  | { ok: false; error: { code: HealthErrorCode; message: string } }

export type { WorkPeopleApi } from './api'

export const HEALTH_CHECK_CHANNEL = 'workpeople:health:check'
