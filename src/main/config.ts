export interface ConnectionConfig {
  target: string
  tlsEnabled: boolean
  caPath?: string
  timeoutMs: number
}

export function parseConnectionConfig(env: NodeJS.ProcessEnv): ConnectionConfig {
  const target = env.GRPC_TARGET?.trim() || '127.0.0.1:50051'
  const match = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?|\[[0-9a-fA-F:]+\]):([0-9]{1,5})$/.exec(target)
  if (!match || Number(match[1]) < 1 || Number(match[1]) > 65535) {
    throw new Error('GRPC_TARGET must be a hostname:port or [IPv6]:port with port 1–65535.')
  }

  const tlsValue = env.GRPC_TLS_ENABLED?.trim() || 'false'
  if (tlsValue !== 'true' && tlsValue !== 'false') {
    throw new Error('GRPC_TLS_ENABLED must be true or false.')
  }

  const timeoutValue = env.GRPC_TIMEOUT_MS?.trim() || '3000'
  const timeoutMs = Number(timeoutValue)
  if (!/^\d+$/.test(timeoutValue) || !Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000) {
    throw new Error('GRPC_TIMEOUT_MS must be an integer from 100 to 30000.')
  }

  const caPath = env.GRPC_TLS_CA_PATH?.trim() || undefined
  const tlsEnabled = tlsValue === 'true'
  if (caPath && !tlsEnabled) {
    throw new Error('GRPC_TLS_CA_PATH requires GRPC_TLS_ENABLED=true.')
  }

  return { target, tlsEnabled, caPath, timeoutMs }
}
