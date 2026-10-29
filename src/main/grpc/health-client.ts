import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Client, credentials, loadPackageDefinition, status, type CallOptions, type ChannelCredentials, type ServiceError } from '@grpc/grpc-js'
import { loadSync } from '@grpc/proto-loader'
import type { HealthResult, HealthSnapshot } from '../../shared/health'
import type { ConnectionConfig } from '../config'

interface HealthClient extends Client {
  check(request: Record<string, never>, options: CallOptions, callback: (error: ServiceError | null, response: unknown) => void): void
}

interface HealthPackage {
  workpeople: { v1: { HealthService: new (target: string, channelCredentials: ChannelCredentials) => HealthClient } }
}

export interface HealthGateway {
  getHealth(): Promise<HealthResult>
  close(): void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseHealthSnapshot(value: unknown): HealthSnapshot | undefined {
  if (!isRecord(value) || !isRecord(value.dependencies)) return undefined
  const { status: healthStatus, service, version, checkedAt, dependencies } = value
  if (healthStatus !== 'ok' && healthStatus !== 'degraded') return undefined
  if (typeof service !== 'string' || !service || typeof version !== 'string' || !version) return undefined
  if (typeof checkedAt !== 'string' || !Number.isFinite(Date.parse(checkedAt))) return undefined
  if (dependencies.postgres !== 'up' && dependencies.postgres !== 'down') return undefined
  if (dependencies.redis !== 'up' && dependencies.redis !== 'down') return undefined

  return {
    status: healthStatus,
    service,
    version,
    checkedAt,
    dependencies: { postgres: dependencies.postgres, redis: dependencies.redis }
  }
}

export function createHealthGateway(config: ConnectionConfig, protoPath: string): HealthGateway {
  const definition = loadSync(protoPath, { keepCase: false, longs: String, enums: String, defaults: true, oneofs: true })
  const loaded = loadPackageDefinition(definition) as unknown as HealthPackage
  const channelCredentials = config.tlsEnabled
    ? credentials.createSsl(config.caPath ? readFileSync(resolve(config.caPath)) : undefined)
    : credentials.createInsecure()
  const client = new loaded.workpeople.v1.HealthService(config.target, channelCredentials)

  return {
    getHealth() {
      return new Promise((resolveResult) => {
        client.check({}, { deadline: Date.now() + config.timeoutMs }, (error, response) => {
          if (error) {
            if (error.code === status.DEADLINE_EXCEEDED) {
              resolveResult({ ok: false, error: { code: 'timeout', message: 'Сервер не ответил вовремя. Повторите проверку.' } })
            } else if (error.code === status.UNAVAILABLE) {
              resolveResult({ ok: false, error: { code: 'unavailable', message: 'Не удалось подключиться к серверу. Проверьте его доступность.' } })
            } else {
              resolveResult({ ok: false, error: { code: 'internal', message: 'Не удалось получить состояние сервера.' } })
            }
            return
          }

          const data = parseHealthSnapshot(response)
          resolveResult(data
            ? { ok: true, data }
            : { ok: false, error: { code: 'invalid_response', message: 'Сервер вернул ответ, несовместимый с версией приложения.' } })
        })
      })
    },
    close: () => client.close()
  }
}
