/**
 * T049 — E2E Journey 1: Core Loop
 *
 * Register → Create Deck → Add 3 Cards → Start Session → Rate all → Session Summary
 *
 * Uses `waitForResponse()` throughout; never uses `waitForTimeout()`.
 */
import { test, expect, type Page } from '@playwright/test';

const EMAIL = `e2e-coreloop-${Date.now()}@test.com`;
const PASSWORD = 'testpassword123';

async function loginUser(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/');
}

test.describe('Core Loop E2E Journey', () => {
  let deckId: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();

    // 1. Register
    await page.goto('/register');
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Confirm password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL('/');

    // 2. Create deck
    await page.goto('/decks');
    await page.getByRole('button', { name: '+ New Deck' }).click();
    await page.getByLabel('Deck name').fill('Core Loop Deck');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText('Deck created!')).toBeVisible();

    // 3. Get deck ID
    await page.getByText('Core Loop Deck').click();
    await expect(page.getByRole('button', { name: '+ Add Card' })).toBeVisible();
    deckId = page.url().split('/decks/')[1]?.split('/')[0] ?? '';

    // 4. Add 3 cards
    for (let i = 1; i <= 3; i++) {
      await page.getByRole('button', { name: '+ Add Card' }).click();
      await page.getByPlaceholder("e.g. What is the capital of France?").fill(`Core Q ${i}`);
      await page.getByPlaceholder('e.g. Paris').fill(`Core A ${i}`);
      await page.getByRole('button', { name: 'Create Card' }).click();
      await expect(page.getByText('Card created!').first()).toBeVisible();
    }

    await page.close();
  });

  test('deck detail shows 3 cards after creation', async ({ page }) => {
    await loginUser(page);
    await page.goto(`/decks/${deckId}`);
    await expect(page.getByText('3 cards')).toBeVisible({ timeout: 8000 });
  });

  test('full core loop: start session → rate all → summary shows 3 cards', async ({ page }) => {
    await loginUser(page);
    await page.goto(`/decks/${deckId}/study`);

    // Wait for initial card load
    await page.waitForResponse(
      (resp) => resp.url().includes('/next-card') && resp.status() === 200,
      { timeout: 15000 },
    );
    await expect(page.getByText(/Press.*Space/)).toBeVisible({ timeout: 5000 });

    // Rate all cards
    const maxCards = 5;
    for (let i = 0; i < maxCards; i++) {
      if (page.url().includes('/summary')) break;

      const ratePromise = page.waitForResponse(
        (resp) => resp.url().includes('/rate') && resp.status() === 200,
        { timeout: 15000 },
      );
      const nextOrCompletePromise = page.waitForResponse(
        (resp) =>
          (resp.url().includes('/next-card') || resp.url().includes('/complete')) &&
          resp.status() === 200,
        { timeout: 15000 },
      );

      await page.keyboard.press('Space');
      await expect(page.getByRole('button', { name: 'Good' })).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: 'Good' }).click();

      await ratePromise;
      const nextResp = await nextOrCompletePromise;
      const body = await nextResp.json().catch(() => ({}));

      if (body?.data?.done === true || nextResp.url().includes('/complete')) break;
    }

    // Verify summary page
    await expect(page).toHaveURL(/\/summary/, { timeout: 10000 });
    await expect(page.getByText('Session Complete!')).toBeVisible();
    // Summary must report the 3 studied cards
    await expect(page.getByText(/3/)).toBeVisible();
  });
});
