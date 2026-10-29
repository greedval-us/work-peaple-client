import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseConnectionConfig } from '../src/main/config.ts'

test('connection defaults are local and bounded', () => {
  assert.deepEqual(parseConnectionConfig({}), {
    target: '127.0.0.1:50051', tlsEnabled: false, caPath: undefined, timeoutMs: 3000
  })
})

test('accepts a TLS DNS target and an IPv6 loopback target', () => {
  assert.deepEqual(parseConnectionConfig({ GRPC_TARGET: 'api.example.org:443', GRPC_TLS_ENABLED: 'true', GRPC_TLS_CA_PATH: 'company.pem', GRPC_TIMEOUT_MS: '5000' }), {
    target: 'api.example.org:443', tlsEnabled: true, caPath: 'company.pem', timeoutMs: 5000
  })
  assert.equal(parseConnectionConfig({ GRPC_TARGET: '[::1]:50051' }).target, '[::1]:50051')
})

test('rejects invalid targets, TLS flags, CA settings and unbounded deadlines', () => {
  for (const target of ['https://api.example.org:443', 'localhost:0', 'localhost:65536', 'localhost:abc', 'localhost']) {
    assert.throws(() => parseConnectionConfig({ GRPC_TARGET: target }), /GRPC_TARGET/)
  }
  assert.throws(() => parseConnectionConfig({ GRPC_TLS_ENABLED: 'yes' }), /GRPC_TLS_ENABLED/)
  assert.throws(() => parseConnectionConfig({ GRPC_TLS_CA_PATH: 'company.pem' }), /requires/)
  for (const timeout of ['0', '-1', '99', '30001', 'Infinity', '1.5', '3e3']) {
    assert.throws(() => parseConnectionConfig({ GRPC_TIMEOUT_MS: timeout }), /GRPC_TIMEOUT_MS/)
  }
})
