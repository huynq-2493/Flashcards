import { test, expect } from '@playwright/test';

const TEST_EMAIL = `e2e-auth-${Date.now()}@test.com`;
const TEST_PASSWORD = 'testpassword123';

test.describe('Authentication', () => {
  test('register → auto-login → dashboard', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await page.getByLabel('Confirm password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/');
    await expect(page.getByText(/Good/)).toBeVisible();
  });

  test('login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('/');
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText(/Invalid credentials|password/i)).toBeVisible();
  });

  test('unauthenticated access to / redirects to /login', async ({ page }) => {
    // Navigate to app first, then clear storage
    await page.goto('/login');
    await page.evaluate(() => localStorage.clear());
    await page.context().clearCookies();

    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('sign out returns to login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.getByLabel('Password').fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL('/login');
  });
});
