import { describe, it, expect } from 'vitest'
import { loginSchema, signupSchema, subscribeSchema, forgotPasswordSchema, inviteAcceptSchema, updatePasswordSchema } from '@/features/auth/model/schemas'
import { isExpiredAuthCallback, parseAuthCallback } from '@/features/auth/lib/password-recovery'

describe('Auth schemas', () => {
  it('validates login form', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: '123456' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email on login', () => {
    const result = loginSchema.safeParse({ email: 'invalid', password: '123456' })
    expect(result.success).toBe(false)
  })

  it('validates public subscribe form without password', () => {
    const result = subscribeSchema.safeParse({
      fullName: 'João Silva',
      email: 'joao@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('rejects subscribe form without a valid email', () => {
    const result = subscribeSchema.safeParse({
      fullName: 'João Silva',
      email: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects short password on signup', () => {
    const result = signupSchema.safeParse({
      fullName: 'João',
      email: 'joao@example.com',
      password: '123',
    })
    expect(result.success).toBe(false)
  })

  it('validates patient invite accept form', () => {
    const result = inviteAcceptSchema.safeParse({
      fullName: 'Maria Paciente',
      password: '123456',
    })
    expect(result.success).toBe(true)
  })

  it('validates forgot password form', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'test@example.com' })
    expect(result.success).toBe(true)
  })

  it('validates matching passwords on reset', () => {
    const result = updatePasswordSchema.safeParse({
      password: '123456',
      confirmPassword: '123456',
    })
    expect(result.success).toBe(true)
  })

  it('rejects mismatched passwords on reset', () => {
    const result = updatePasswordSchema.safeParse({
      password: '123456',
      confirmPassword: '654321',
    })
    expect(result.success).toBe(false)
  })

  it('detects expired recovery callback from the hash the user saw', () => {
    const params = parseAuthCallback(
      '',
      '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&sb=',
    )
    expect(isExpiredAuthCallback(params)).toBe(true)
    expect(params.errorDescription).toBe('Email link is invalid or has expired')
  })

  it('reads a prefetch-safe recovery token from the query string', () => {
    const params = parseAuthCallback('?token_hash=abc123&type=recovery', '')
    expect(params.tokenHash).toBe('abc123')
    expect(params.type).toBe('recovery')
    expect(isExpiredAuthCallback(params)).toBe(false)
  })
})
