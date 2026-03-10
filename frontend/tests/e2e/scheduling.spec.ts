/**
 * T051 — E2E Journey 3: SRS Scheduling
 *
 * Rate all cards "Again" → verify session completes → dashboard due count drops to 0
 * (cards rated "Again" are scheduled for tomorrow, so today's due count = 0)
 *
 * Uses `waitForResponse()` throughout.
 */
import { test, expect, type Page } from '@playwright/test';

const EMAIL = `e2e-scheduling-${Date.now()}@test.com`;
const PASSWORD = 'testpassword123';

async function loginUser(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/');
}

test.describe('SRS Scheduling', () => {
  let deckId: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();

    // Register
    await page.goto('/register');
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Confirm password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL('/');

    // Create deck
    await page.goto('/decks');
    await page.getByRole('button', { name: '+ New Deck' }).click();
    await page.getByLabel('Deck name').fill('Scheduling Test Deck');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText('Deck created!')).toBeVisible();

    // Get deck ID
    await page.getByText('Scheduling Test Deck').click();
    await expect(page.getByRole('button', { name: '+ Add Card' })).toBeVisible();
    deckId = page.url().split('/decks/')[1]?.split('/')[0] ?? '';

    // Add 3 cards
    for (let i = 1; i <= 3; i++) {
      await page.getByRole('button', { name: '+ Add Card' }).click();
      await page.getByPlaceholder("e.g. What is the capital of France?").fill(`Sched Q ${i}`);
      await page.getByPlaceholder('e.g. Paris').fill(`Sched A ${i}`);
      await page.getByRole('button', { name: 'Create Card' }).click();
      await expect(page.getByText('Card created!').first()).toBeVisible();
    }

    await page.close();
  });

  test('rating all cards "Again" completes the session and clears due count', async ({ page }) => {
    await loginUser(page);
    await page.goto(`/decks/${deckId}/study`);

    // Wait for first card
    await page.waitForResponse(
      (resp) => resp.url().includes('/next-card') && resp.status() === 200,
      { timeout: 15000 },
    );
    await expect(page.getByText(/Press.*Space/)).toBeVisible({ timeout: 5000 });

    // Rate all cards "Again"
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
      await expect(page.getByRole('button', { name: 'Again' })).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: 'Again' }).click();

      await ratePromise;
      const nextResp = await nextOrCompletePromise;
      const body = await nextResp.json().catch(() => ({}));

      if (body?.data?.done === true || nextResp.url().includes('/complete')) break;
    }

    // Session complete — verify summary page
    await expect(page).toHaveURL(/\/summary/, { timeout: 10000 });
    await expect(page.getByText('Session Complete!')).toBeVisible();

    // Navigate to dashboard and verify 0 due today for this deck
    await page.goto('/');
    // Dashboard loads stats — wait for the due count tile
    await expect(page.getByText(/Due Today/i)).toBeVisible({ timeout: 8000 });

    // After rating all "Again", cards are scheduled for tomorrow → 0 due today
    // The stat card should show 0 (no cards due right now)
    const dueTile = page.locator('p', { hasText: /Due Today/i }).locator('..');
    await expect(dueTile.locator('p.text-3xl')).toHaveText('0', { timeout: 5000 });
  });
});
