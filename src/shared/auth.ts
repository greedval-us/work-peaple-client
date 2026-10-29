export interface LoginCredentials {
  login: string
  password: string
}

export interface AuthUser {
  id: string
  login: string
  firstName: string
  lastName: string
  middleName: string
  email: string
  phone: string
  roles: { id: string; code: string; name: string }[]
  permissions: string[]
}

export interface AuthSession {
  user: AuthUser
  expiresAt: string
}

export type AuthErrorCode = 'invalid_credentials' | 'invalid_input' | 'unauthenticated'
  | 'timeout' | 'unavailable' | 'rate_limited' | 'invalid_response' | 'forbidden' | 'cancelled' | 'internal'

export type AuthResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: AuthErrorCode; message: string } }

export const AUTH_LOGIN_CHANNEL = 'workpeople:auth:login'
export const AUTH_CURRENT_USER_CHANNEL = 'workpeople:auth:current-user'
export const AUTH_LOGOUT_CHANNEL = 'workpeople:auth:logout'

// IPC accepts plain objects only; password whitespace is significant.
export function parseLoginCredentials(value: unknown): LoginCredentials | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const input = value as Record<string, unknown>
  if (Object.keys(input).some((key) => key !== 'login' && key !== 'password')) return undefined
  if (typeof input.login !== 'string' || typeof input.password !== 'string') return undefined
  const login = input.login.trim()
  if (input.login.length > 128 || !/^[a-z0-9][a-z0-9._-]{2,63}$/i.test(login)
      || !input.password || input.password.length > 256
      || new TextEncoder().encode(input.password).length > 1024) return undefined
  return { login, password: input.password }
}
