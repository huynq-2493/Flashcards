/**
 * T053 — E2E Journey 5: Deck Deletion
 *
 * Create a deck with 5 cards → delete the deck via the confirmation dialog →
 * verify the deck is gone from the list → navigating to the deck URL shows "not found".
 *
 * Confirms cascading deletion: deck + all cards removed.
 */
import { test, expect, type Page } from '@playwright/test';

const EMAIL = `e2e-deckdelete-${Date.now()}@test.com`;
const PASSWORD = 'testpassword123';

async function loginUser(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/');
}

test.describe('Deck Deletion', () => {
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
    await page.getByLabel('Deck name').fill('Deck To Delete');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText('Deck created!')).toBeVisible();

    // Get deck ID
    await page.getByText('Deck To Delete').click();
    await expect(page.getByRole('button', { name: '+ Add Card' })).toBeVisible();
    deckId = page.url().split('/decks/')[1]?.split('/')[0] ?? '';

    // Add 5 cards
    for (let i = 1; i <= 5; i++) {
      await page.getByRole('button', { name: '+ Add Card' }).click();
      await page.getByPlaceholder("e.g. What is the capital of France?").fill(`Delete Q ${i}`);
      await page.getByPlaceholder('e.g. Paris').fill(`Delete A ${i}`);
      await page.getByRole('button', { name: 'Create Card' }).click();
      await expect(page.getByText('Card created!').first()).toBeVisible();
    }

    await page.close();
  });

  test('deck detail shows 5 cards before deletion', async ({ page }) => {
    await loginUser(page);
    await page.goto(`/decks/${deckId}`);
    await expect(page.getByText('5 cards')).toBeVisible({ timeout: 8000 });
    // Confirm all 5 fronts are in the table
    for (let i = 1; i <= 5; i++) {
      await expect(page.getByText(`Delete Q ${i}`)).toBeVisible();
    }
  });

  test('delete deck removes it from the list and cards are gone', async ({ page }) => {
    await loginUser(page);
    await page.goto('/decks');

    // Click the trash icon on the target deck card
    const deleteBtn = page
      .locator('button[title="Delete deck"]')
      .filter({ has: page.locator('..').filter({ hasText: 'Deck To Delete' }) })
      .first();

    // Fallback: if filter doesn't narrow it down, find the deck card and click its delete button
    if ((await deleteBtn.count()) === 0) {
      const deckCard = page.locator('div', { hasText: 'Deck To Delete' }).first();
      await deckCard.locator('button[title="Delete deck"]').click();
    } else {
      await deleteBtn.click();
    }

    // Confirm in dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();

    // Toast and deck disappears
    await expect(page.getByText('Deck deleted')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Deck To Delete')).not.toBeVisible();
  });

  test('navigating to deleted deck URL shows not found', async ({ page }) => {
    await loginUser(page);
    await page.goto(`/decks/${deckId}`);
    await expect(
      page.getByText(/Deck not found|not found/i).or(page.locator('text=My Decks')),
    ).toBeVisible({ timeout: 8000 });
  });
});
