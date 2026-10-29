import type { AuthResult, AuthSession, LoginCredentials } from './auth'
import type { HealthResult } from './health'

export interface WorkPeopleApi {
  getHealth(): Promise<HealthResult>
  login(credentials: LoginCredentials): Promise<AuthResult<AuthSession>>
  getCurrentUser(): Promise<AuthResult<AuthSession | null>>
  logout(): Promise<AuthResult<null>>
}
