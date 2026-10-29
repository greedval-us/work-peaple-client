import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { Server, ServerCredentials, loadPackageDefinition } from '@grpc/grpc-js'
import { loadSync } from '@grpc/proto-loader'
import { createHealthGateway } from '../src/main/grpc/health-client.ts'

const protoPath = resolve('proto/workpeople/v1/health.proto')
const descriptor = loadPackageDefinition(loadSync(protoPath, { keepCase: false, defaults: true }))

async function startServer(context, handler, timeoutMs = 1000) {
  const server = new Server()
  server.addService(descriptor.workpeople.v1.HealthService.service, { check: handler })
  const port = await new Promise((resolvePort, reject) => {
    server.bindAsync('127.0.0.1:0', ServerCredentials.createInsecure(), (error, port) => {
      if (error) reject(error)
      else resolvePort(port)
    })
  })
  const gateway = createHealthGateway({ target: `127.0.0.1:${port}`, tlsEnabled: false, timeoutMs }, protoPath)
  context.after(() => { gateway.close(); server.forceShutdown() })
  return { gateway, server }
}

const healthy = {
  status: 'ok', service: 'work-people-api', version: '0.1.0',
  checkedAt: '2026-10-29T20:00:00.000Z', dependencies: { postgres: 'up', redis: 'up' }
}

test('native gRPC client decodes checked_at into the shared health shape', async (context) => {
  const { gateway } = await startServer(context, (_call, callback) => callback(null, healthy))
  assert.deepEqual(await gateway.getHealth(), { ok: true, data: healthy })
})

test('degraded dependency state is preserved across real protobuf transport', async (context) => {
  const degraded = { ...healthy, status: 'degraded', dependencies: { postgres: 'up', redis: 'down' } }
  const { gateway } = await startServer(context, (_call, callback) => callback(null, degraded))
  assert.deepEqual(await gateway.getHealth(), { ok: true, data: degraded })
})

test('malformed health data produces a serializable contract error', async (context) => {
  const { gateway } = await startServer(context, (_call, callback) => callback(null, { ...healthy, status: 'unexpected' }))
  const result = await gateway.getHealth()
  assert.equal(result.ok, false)
  assert.equal(result.error.code, 'invalid_response')
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result)
})

test('an unresponsive server is bounded by the configured deadline', async (context) => {
  const { gateway } = await startServer(context, () => {}, 100)
  const started = Date.now()
  const result = await gateway.getHealth()
  assert.equal(result.ok, false)
  assert.equal(result.error.code, 'timeout')
  assert.ok(Date.now() - started < 3000, 'health call must complete without waiting indefinitely')
})

test('a stopped server returns an unavailable result', async (context) => {
  const { gateway, server } = await startServer(context, (_call, callback) => callback(null, healthy))
  server.forceShutdown()
  const result = await gateway.getHealth()
  assert.equal(result.ok, false)
  assert.equal(result.error.code, 'unavailable')
})
