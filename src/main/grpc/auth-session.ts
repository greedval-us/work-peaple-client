import type { AuthErrorCode, AuthResult, AuthSession, AuthUser, LoginCredentials } from '../../shared/auth'

export interface AuthTransport {
  login(credentials: LoginCredentials): Promise<unknown>
  getCurrentUser(token: string): Promise<unknown>
  logout(token: string): Promise<void>
  close(): void
}

export interface AuthGateway {
  login(credentials: LoginCredentials): Promise<AuthResult<AuthSession>>
  getCurrentUser(): Promise<AuthResult<AuthSession | null>>
  logout(): Promise<AuthResult<null>>
  close(): void
}

function failure<T>(code: AuthErrorCode, message: string): AuthResult<T> {
  return { ok: false, error: { code, message } }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown, max = 1024): value is string {
  return typeof value === 'string' && value.length <= max
}

function sessionToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value)
}

function parseUser(value: unknown): AuthUser | undefined {
  if (!record(value) || !text(value.id, 128) || !value.id || !text(value.login, 128) || !value.login
      || value.isActive !== true || !Array.isArray(value.roles) || value.roles.length > 256
      || !Array.isArray(value.permissions) || value.permissions.length > 4096) return undefined
  const fields = ['firstName', 'lastName', 'middleName', 'email', 'phone'] as const
  if (fields.some((field) => !text(value[field]))) return undefined
  const roles: AuthUser['roles'] = []
  for (const role of value.roles) {
    if (!record(role) || !text(role.id, 128) || !role.id || !text(role.code, 128) || !role.code || !text(role.name)) return undefined
    roles.push({ id: role.id, code: role.code, name: role.name })
  }
  if (!value.permissions.every((permission) => text(permission, 256))) return undefined
  return {
    id: value.id, login: value.login,
    firstName: value.firstName as string, lastName: value.lastName as string,
    middleName: value.middleName as string, email: value.email as string, phone: value.phone as string,
    roles, permissions: [...value.permissions] as string[]
  }
}

function rpcFailure<T>(error: unknown, login = false): AuthResult<T> {
  const code = record(error) ? error.code : undefined
  // gRPC status numbers are mapped to fixed text; server details never cross IPC.
  if (code === 16) return failure(login ? 'invalid_credentials' : 'unauthenticated', login
    ? 'Неверный логин или пароль.' : 'Сеанс завершён. Войдите снова.')
  if (code === 3) return failure('invalid_input', 'Проверьте логин и пароль.')
  if (code === 4) return failure('timeout', 'Сервер не ответил вовремя. Попробуйте ещё раз.')
  if (code === 14) return failure('unavailable', 'Нет соединения с сервером. Проверьте подключение и попробуйте снова.')
  if (code === 7) return failure('forbidden', 'Доступ к рабочему пространству запрещён. Обратитесь к администратору.')
  if (code === 8) return failure('rate_limited', 'Слишком много попыток входа. Подождите и попробуйте снова.')
  if (code === 13) return failure('internal', 'Не удалось выполнить запрос. Попробуйте ещё раз.')
  return failure('internal', 'Не удалось выполнить запрос. Попробуйте ещё раз.')
}

/** Owns the only session token, in main-process memory. DTOs never contain it. */
export function createAuthSession(transport: AuthTransport, now = Date.now): AuthGateway {
  let token: string | undefined
  let expiresAt: string | undefined
  let generation = 0
  let loginPending = false
  let closed = false

  function clearSession(): void { token = undefined; expiresAt = undefined }
  function cancelled<T>(): AuthResult<T> { return failure('cancelled', 'Запрос отменён. Повторите вход.') }

  return {
    async login(credentials) {
      if (closed || loginPending) return cancelled()
      const operation = ++generation
      loginPending = true
      if (token) void transport.logout(token).catch(() => {})
      clearSession()
      // The short-lived request is released after dispatch. No credentials are retained.
      let request: LoginCredentials | undefined = { ...credentials }
      try {
        const responsePromise = transport.login(request)
        request = undefined
        credentials = { login: '', password: '' }
        const response = await responsePromise
        if (closed || operation !== generation) {
          // A logout can overtake Login; revoke that newly issued server session too.
          if (!closed && record(response) && sessionToken(response.sessionToken)) {
            void transport.logout(response.sessionToken).catch(() => {})
          }
          return cancelled()
        }
        if (!record(response) || !sessionToken(response.sessionToken)
            || !text(response.expiresAt, 64) || !Number.isFinite(Date.parse(response.expiresAt))
            || Date.parse(response.expiresAt) <= now()) {
          if (record(response) && sessionToken(response.sessionToken)) void transport.logout(response.sessionToken).catch(() => {})
          return failure('invalid_response', 'Сервер вернул несовместимый ответ. Обратитесь к администратору.')
        }
        const user = parseUser(response.user)
        if (!user) {
          void transport.logout(response.sessionToken).catch(() => {})
          return failure('invalid_response', 'Сервер вернул несовместимый ответ. Обратитесь к администратору.')
        }
        token = response.sessionToken
        expiresAt = response.expiresAt
        return { ok: true, data: { user, expiresAt } }
      } catch (error) {
        return operation === generation && !closed ? rpcFailure(error, true) : cancelled()
      } finally {
        request = undefined
        loginPending = false
      }
    },
    async getCurrentUser() {
      if (closed || !token || !expiresAt) return { ok: true, data: null }
      if (Date.parse(expiresAt) <= now()) {
        ++generation
        clearSession()
        return failure('unauthenticated', 'Сеанс завершён. Войдите снова.')
      }
      const operation = generation
      const sessionToken = token
      const sessionExpiry = expiresAt
      try {
        const response = await transport.getCurrentUser(sessionToken)
        if (closed || operation !== generation) return cancelled()
        if (Date.parse(sessionExpiry) <= now()) {
          ++generation
          clearSession()
          return failure('unauthenticated', 'Сеанс завершён. Войдите снова.')
        }
        const user = parseUser(response)
        return user ? { ok: true, data: { user, expiresAt: sessionExpiry } }
          : failure('invalid_response', 'Сервер вернул несовместимый ответ. Обратитесь к администратору.')
      } catch (error) {
        if (closed || operation !== generation) return cancelled()
        const result = rpcFailure<AuthSession | null>(error)
        if (!result.ok && result.error.code === 'unauthenticated') {
          ++generation
          clearSession()
        }
        return result
      }
    },
    async logout() {
      ++generation
      const sessionToken = token
      clearSession()
      if (!sessionToken || closed) return { ok: true, data: null }
      try {
        await transport.logout(sessionToken)
        return { ok: true, data: null }
      } catch (error) {
        return rpcFailure(error)
      }
    },
    close() {
      closed = true
      ++generation
      clearSession()
      transport.close()
    }
  }
}
