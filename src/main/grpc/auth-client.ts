import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Client, credentials, loadPackageDefinition, Metadata, type CallOptions, type ChannelCredentials, type ServiceError } from '@grpc/grpc-js'
import { loadSync } from '@grpc/proto-loader'
import type { LoginCredentials } from '../../shared/auth'
import type { ConnectionConfig } from '../config'
import { createAuthSession, type AuthGateway } from './auth-session'

interface AuthClient extends Client {
  login(request: LoginCredentials, options: CallOptions, callback: RpcCallback): void
  getCurrentUser(request: Record<string, never>, metadata: Metadata, options: CallOptions, callback: RpcCallback): void
  logout(request: Record<string, never>, metadata: Metadata, options: CallOptions, callback: RpcCallback): void
}
type RpcCallback = (error: ServiceError | null, response: unknown) => void
interface AuthPackage {
  workpeople: { v1: { AuthService: new (target: string, channelCredentials: ChannelCredentials) => AuthClient } }
}

export function createAuthGateway(config: ConnectionConfig, protoPath: string): AuthGateway {
  const definition = loadSync(protoPath, { keepCase: false, longs: String, enums: String, defaults: true, oneofs: true })
  const loaded = loadPackageDefinition(definition) as unknown as AuthPackage
  const channelCredentials = config.tlsEnabled
    ? credentials.createSsl(config.caPath ? readFileSync(resolve(config.caPath)) : undefined)
    : credentials.createInsecure()
  const client = new loaded.workpeople.v1.AuthService(config.target, channelCredentials)
  const options = (): CallOptions => ({ deadline: Date.now() + config.timeoutMs })
  const metadata = (token: string): Metadata => {
    const value = new Metadata()
    value.set('authorization', `Bearer ${token}`)
    return value
  }
  function call(invoke: (callback: RpcCallback) => void): Promise<unknown> {
    return new Promise((resolveResponse, reject) => {
      invoke((error, response) => error ? reject(error) : resolveResponse(response))
    })
  }
  return createAuthSession({
    login: (request) => call((callback) => client.login(request, options(), callback)),
    getCurrentUser: (token) => call((callback) => client.getCurrentUser({}, metadata(token), options(), callback)),
    logout: async (token) => { await call((callback) => client.logout({}, metadata(token), options(), callback)) },
    close: () => client.close()
  })
}
