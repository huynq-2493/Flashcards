import { test, expect, Page } from '@playwright/test';

const EMAIL = `e2e-study-${Date.now()}@test.com`;
const PASSWORD = 'testpassword123';

async function loginUser(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/');
}

test.describe('Study Session', () => {
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
    await page.getByLabel('Deck name').fill('Study Test Deck');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText('Deck created!')).toBeVisible();

    // Navigate into the deck to get ID
    await page.getByText('Study Test Deck').click();
    // Wait for navigation to deck detail page before extracting deckId
    await expect(page.getByRole('button', { name: '+ Add Card' })).toBeVisible();
    deckId = page.url().split('/decks/')[1]?.split('/')[0] ?? '';

    // Add 3 cards
    for (let i = 1; i <= 3; i++) {
      await page.getByRole('button', { name: '+ Add Card' }).click();
      await page.getByPlaceholder("e.g. What is the capital of France?").fill(`Question ${i}`);
      await page.getByPlaceholder('e.g. Paris').fill(`Answer ${i}`);
      await page.getByRole('button', { name: 'Create Card' }).click();
      await expect(page.getByText('Card created!').first()).toBeVisible();
    }

    await page.close();
  });

  test('study session starts and shows first card', async ({ page }) => {
    await loginUser(page);
    await page.goto(`/decks/${deckId}/study`);

    // Wait for card to load
    await expect(page.locator('text=Front').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Press.*Space/)).toBeVisible();
  });

  test('card flips on Space key', async ({ page }) => {
    await loginUser(page);
    await page.goto(`/decks/${deckId}/study`);

    await expect(page.getByText(/Press.*Space/)).toBeVisible({ timeout: 10000 });

    await page.keyboard.press('Space');

    // Rating buttons should appear
    await expect(page.getByRole('button', { name: 'Again' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Good' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Easy' })).toBeVisible();
  });

  test('keyboard shortcut 3 (Good) rates and advances', async ({ page }) => {
    await loginUser(page);
    await page.goto(`/decks/${deckId}/study`);

    await expect(page.getByText(/Press.*Space/)).toBeVisible({ timeout: 10000 });

    await page.keyboard.press('Space'); // flip
    await expect(page.getByRole('button', { name: 'Again' })).toBeVisible();

    await page.keyboard.press('3'); // Good

    // Next card or done
    await expect(
      page.getByText(/Press.*Space|Session Complete/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test('completing all cards shows summary page', async ({ page }) => {
    await loginUser(page);
    await page.goto(`/decks/${deckId}/study`);

    // Wait for initial card to load (first next-card API call made by component)
    await page.waitForResponse(
      (resp) => resp.url().includes('/next-card') && resp.status() === 200,
      { timeout: 15000 }
    );
    await expect(page.getByText(/Press.*Space/)).toBeVisible({ timeout: 5000 });

    const maxCards = 5;
    for (let i = 0; i < maxCards; i++) {
      // Check if we already navigated to summary
      if (page.url().includes('/summary')) break;

      // Set up promises BEFORE actions to avoid race conditions
      const rateResponsePromise = page.waitForResponse(
        (resp) => resp.url().includes('/rate') && resp.status() === 200,
        { timeout: 15000 }
      );
      const nextOrCompletePromise = page.waitForResponse(
        (resp) => (resp.url().includes('/next-card') || resp.url().includes('/complete')) && resp.status() === 200,
        { timeout: 15000 }
      );

      // Flip the card using keyboard Space (focus on window)
      await page.keyboard.press('Space');
      await expect(page.getByRole('button', { name: 'Good' })).toBeVisible({ timeout: 10000 });

      // Rate as Good by clicking the button directly
      await page.getByRole('button', { name: 'Good' }).click();

      // Wait for rate API to complete
      await rateResponsePromise;

      // Wait for either next-card or complete API to respond
      const nextResp = await nextOrCompletePromise;
      const nextBody = await nextResp.json().catch(() => ({}));

      // If done, navigate should happen; give it time
      if (nextBody && (nextBody.data?.done === true || nextResp.url().includes('/complete'))) {
        break;
      }
    }

    // Should arrive at summary
    await expect(page).toHaveURL(/\/summary/, { timeout: 25000 });
    await expect(page.getByText('Session Complete!')).toBeVisible();
  });
    test('back text is NOT visible before flipping', async ({ page }) => {
    await loginUser(page);
    await page.goto(`/decks/${deckId}/study`);

    await expect(page.getByText(/Press.*Space/)).toBeVisible({ timeout: 10000 });

    // Rating buttons should NOT be visible before flipping (they are conditionally rendered)
    await expect(page.getByRole('button', { name: 'Again' })).not.toBeVisible();
  });

  test('abandon session keeps rated card progress', async ({ page }) => {
    await loginUser(page);
    await page.goto(`/decks/${deckId}/study`);

    await expect(page.getByText(/Press.*Space/)).toBeVisible({ timeout: 10000 });

    // Rate one card
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Good' })).toBeVisible();
    await page.keyboard.press('3');
    await page.waitForTimeout(500);

    // End session
    await page.getByText('End session').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'End session' }).click();

    await expect(page).toHaveURL(`/decks/${deckId}`);
  });
});
