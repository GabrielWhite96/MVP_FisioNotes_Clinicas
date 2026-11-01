const PASSWORD_RECOVERY_KEY = 'tf-password-recovery'

export interface AuthCallbackParams {
  type: string | null
  tokenHash: string | null
  error: string | null
  errorCode: string | null
  errorDescription: string | null
}

export function parseAuthCallback(search: string, hash: string): AuthCallbackParams {
  const query = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  const read = (key: string) => hashParams.get(key) ?? query.get(key)

  return {
    type: read('type'),
    tokenHash: query.get('token_hash'),
    error: read('error'),
    errorCode: read('error_code'),
    errorDescription: read('error_description')?.replace(/\+/g, ' ') ?? null,
  }
}

export function isExpiredAuthCallback(params: AuthCallbackParams) {
  return params.errorCode === 'otp_expired' || params.error === 'access_denied'
}

export function capturePasswordRecoveryFromUrl() {
  if (typeof window === 'undefined') return parseAuthCallback('', '')
  const params = parseAuthCallback(window.location.search, window.location.hash)
  if (params.type === 'recovery') markPasswordRecovery()
  return params
}

export function markPasswordRecovery() {
  try {
    sessionStorage.setItem(PASSWORD_RECOVERY_KEY, '1')
  } catch {
    // Private mode can throw.
  }
}

export function isPasswordRecovery() {
  try {
    return sessionStorage.getItem(PASSWORD_RECOVERY_KEY) === '1'
  } catch {
    return false
  }
}

export function clearPasswordRecovery() {
  try {
    sessionStorage.removeItem(PASSWORD_RECOVERY_KEY)
  } catch {
    // Private mode can throw.
  }
}
