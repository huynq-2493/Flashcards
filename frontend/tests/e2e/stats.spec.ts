import { test, expect } from '@playwright/test';

const EMAIL = `e2e-stats-${Date.now()}@test.com`;
const PASSWORD = 'testpassword123';

test.describe('Statistics Page', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('/register');
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Confirm password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL('/');
    await page.close();
  });

  test('stats page loads with summary cards', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');

    await page.goto('/stats');
    await expect(page.getByText('Statistics')).toBeVisible();
    await expect(page.getByText('Due Today')).toBeVisible();
    await expect(page.getByText('Streak')).toBeVisible();
    await expect(page.getByText('Retention', { exact: true })).toBeVisible();
    await expect(page.getByText('Total Cards')).toBeVisible();
  });

  test('charts load lazily without error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/');

    await page.goto('/stats');

    // Wait for lazy-loaded charts section
    await expect(page.getByText(/Review Activity/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Upcoming Reviews/)).toBeVisible();
    await expect(page.getByText(/Retention Rate/)).toBeVisible();

    // No error messages
    await expect(page.getByText(/error|failed|crash/i)).not.toBeVisible();
  });
});
