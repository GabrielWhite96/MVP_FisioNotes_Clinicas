import { test, expect } from '@playwright/test'

test.describe('Fisionotes core flow', () => {
  test('login page is reachable', async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible()
  })

  test('public subscribe collects email instead of creating an account', async ({ page }) => {
    await page.goto('/assinar')
    await expect(page.getByRole('heading', { name: /assinar o fisionotes/i })).toBeVisible()
    await expect(page.getByLabel(/e-mail/i)).toBeVisible()
    await expect(page.getByLabel(/nome completo/i)).toBeVisible()
    await expect(page.getByLabel(/senha/i)).toHaveCount(0)
  })

  test('home page loads brand', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByAltText(/Fisionotes/i).first()).toBeVisible()
  })
})
