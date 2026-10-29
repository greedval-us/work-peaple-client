import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createAuthSession } from '../src/main/grpc/auth-session.ts'
import { parseLoginCredentials } from '../src/shared/auth.ts'

const user = {
  id: 'user-1', login: 'admin', firstName: 'Анна', lastName: 'Иванова', middleName: '',
  email: '', phone: '', isActive: true, roles: [{ id: 'role-1', code: 'admin', name: 'Администратор' }],
  permissions: ['users.read'], passwordHash: 'must-not-cross-ipc'
}
const token = 'a'.repeat(43)
const expiresAt = '2026-11-01T00:00:00.000Z'
const now = () => Date.parse('2026-10-30T00:00:00.000Z')
const credentials = { login: 'admin', password: 'admin' }
const response = () => ({ sessionToken: token, expiresAt, user })

function setup(overrides = {}) {
  const calls = { login: 0, current: [], logout: [], close: 0 }
  const transport = {
    login: async () => { calls.login++; return response() },
    getCurrentUser: async (value) => { calls.current.push(value); return user },
    logout: async (value) => { calls.logout.push(value) },
    close: () => { calls.close++ },
    ...overrides
  }
  return { gateway: createAuthSession(transport, now), calls }
}

test('credentials validation bounds IPC input and preserves password whitespace', () => {
  assert.deepEqual(parseLoginCredentials({ login: ' Admin ', password: ' secret ' }), { login: 'Admin', password: ' secret ' })
  for (const value of [null, [], { login: 'ab', password: 'x' }, { login: 'admin', password: '' },
    { login: 'admin', password: 'x'.repeat(257) }, { login: 'admin', password: 'x', token: 'injected' },
    { login: 'админ', password: 'x' }, { login: 'x'.repeat(65), password: 'x' }]) {
    assert.equal(parseLoginCredentials(value), undefined)
  }
})

test('anonymous lookup never calls transport and success exposes only the safe profile', async () => {
  const { gateway, calls } = setup()
  assert.deepEqual(await gateway.getCurrentUser(), { ok: true, data: null })
  assert.deepEqual(calls.current, [])
  const result = await gateway.login(credentials)
  assert.equal(result.ok, true)
  assert.equal(result.data.user.login, 'admin')
  assert.equal('sessionToken' in result.data, false)
  assert.equal('passwordHash' in result.data.user, false)
  assert.equal(JSON.stringify(result).includes(token), false)
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result)
  assert.equal((await gateway.getCurrentUser()).ok, true)
  assert.deepEqual(calls.current, [token])
})

test('transport secrets are replaced with stable errors and unavailable preserves the session', async () => {
  let failure = { code: 14, details: 'sensitive server internals' }
  const { gateway, calls } = setup({ getCurrentUser: async () => { calls.current.push(token); throw failure } })
  await gateway.login(credentials)
  const unavailable = await gateway.getCurrentUser()
  assert.equal(unavailable.error.code, 'unavailable')
  assert.equal(JSON.stringify(unavailable).includes('sensitive'), false)
  await gateway.getCurrentUser()
  assert.equal(calls.current.length, 2)
  failure = { code: 16 }
  assert.equal((await gateway.getCurrentUser()).error.code, 'unauthenticated')
  assert.deepEqual(await gateway.getCurrentUser(), { ok: true, data: null })
  assert.equal(calls.current.length, 3)
})

test('failed logout still clears the local session', async () => {
  const { gateway } = setup({ logout: async () => { throw { code: 14 } } })
  await gateway.login(credentials)
  assert.equal((await gateway.logout()).error.code, 'unavailable')
  assert.deepEqual(await gateway.getCurrentUser(), { ok: true, data: null })
})

test('login rate limits return actionable fixed text without server details', async () => {
  const { gateway } = setup({ login: async () => { throw { code: 8, details: 'private limiter key and state' } } })
  const result = await gateway.login(credentials)
  assert.deepEqual(result, {
    ok: false,
    error: { code: 'rate_limited', message: 'Слишком много попыток входа. Подождите и попробуйте снова.' }
  })
  assert.equal(JSON.stringify(result).includes('private'), false)
  assert.deepEqual(await gateway.getCurrentUser(), { ok: true, data: null })
})

test('logout overtaking Login prevents session resurrection and revokes the late token', async () => {
  let resolveLogin
  const { gateway, calls } = setup({ login: () => new Promise((resolve) => { resolveLogin = resolve }) })
  const pending = gateway.login(credentials)
  assert.equal((await gateway.login(credentials)).error.code, 'cancelled')
  await gateway.logout()
  resolveLogin(response())
  assert.equal((await pending).error.code, 'cancelled')
  assert.deepEqual(await gateway.getCurrentUser(), { ok: true, data: null })
  assert.deepEqual(calls.logout, [token])
})

test('late profile response cannot restore a logged-out user', async () => {
  let resolveCurrent
  const { gateway } = setup({ getCurrentUser: () => new Promise((resolve) => { resolveCurrent = resolve }) })
  await gateway.login(credentials)
  const pending = gateway.getCurrentUser()
  await gateway.logout()
  resolveCurrent(user)
  assert.equal((await pending).error.code, 'cancelled')
  assert.deepEqual(await gateway.getCurrentUser(), { ok: true, data: null })
})

test('expired sessions clear without a transport request and close removes the token', async () => {
  let time = now()
  const calls = []
  const gateway = createAuthSession({
    login: async () => response(), getCurrentUser: async () => { calls.push('current'); return user },
    logout: async () => {}, close: () => { calls.push('close') }
  }, () => time)
  await gateway.login(credentials)
  time = Date.parse(expiresAt)
  assert.equal((await gateway.getCurrentUser()).error.code, 'unauthenticated')
  assert.deepEqual(calls, [])
  assert.deepEqual(await gateway.getCurrentUser(), { ok: true, data: null })
  gateway.close()
  assert.deepEqual(calls, ['close'])
})

test('malformed or inactive profiles never establish a session', async () => {
  for (const invalid of [{ ...user, isActive: false }, { ...user, roles: [{}] }, { ...user, permissions: [42] }]) {
    const { gateway, calls } = setup({ login: async () => ({ ...response(), user: invalid }) })
    assert.equal((await gateway.login(credentials)).error.code, 'invalid_response')
    assert.deepEqual(await gateway.getCurrentUser(), { ok: true, data: null })
    assert.deepEqual(calls.logout, [token])
  }
})
