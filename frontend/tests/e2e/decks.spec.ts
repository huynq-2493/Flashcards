import { test, expect, Page } from '@playwright/test';

const EMAIL = `e2e-decks-${Date.now()}@test.com`;
const PASSWORD = 'testpassword123';

async function loginUser(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/');
}

test.beforeAll(async ({ browser }) => {
  // Register user once before all deck tests
  const page = await browser.newPage();
  await page.goto('/register');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/');
  await page.close();
});

test.describe('Deck Management', () => {
  test('create a new deck', async ({ page }) => {
    await loginUser(page);
    await page.goto('/decks');

    await page.getByRole('button', { name: '+ New Deck' }).click();
    await page.getByLabel('Deck name').fill('Test Spanish Deck');
    await page.getByLabel('Description (optional)').fill('Basic Spanish words');
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.getByText('Test Spanish Deck')).toBeVisible();
    await expect(page.getByText('Deck created!')).toBeVisible();
  });

  test('deck appears in the deck list', async ({ page }) => {
    await loginUser(page);
    await page.goto('/decks');
    await expect(page.getByText('Test Spanish Deck')).toBeVisible();
  });

  test('open deck detail page', async ({ page }) => {
    await loginUser(page);
    await page.goto('/decks');
    await page.getByText('Test Spanish Deck').click();

    await expect(page.getByRole('heading', { name: 'Test Spanish Deck' })).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Add Card' })).toBeVisible();
  });

  test('add a card to a deck', async ({ page }) => {
    await loginUser(page);
    await page.goto('/decks');
    await page.getByText('Test Spanish Deck').click();

    await page.getByRole('button', { name: '+ Add Card' }).click();
    await expect(page).toHaveURL(/\/cards\/new$/);

    await page.getByPlaceholder("e.g. What is the capital of France?").fill('Hola');
    await page.getByPlaceholder('e.g. Paris').fill('Hello');
    await page.getByRole('button', { name: 'Create Card' }).click();

    await expect(page.getByText('Card created!')).toBeVisible();
    await expect(page).not.toHaveURL(/\/cards\/new$/);
  });

  test('delete a deck with confirmation', async ({ page }) => {
    await loginUser(page);
    await page.goto('/decks');

    // Create a temporary deck to delete
    await page.getByRole('button', { name: '+ New Deck' }).click();
    await page.getByLabel('Deck name').fill('Temp Delete Deck');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText('Deck created!')).toBeVisible();

    // Find delete button in the card
    const deckCard = page.locator('[data-testid="deck-card"]', { hasText: 'Temp Delete Deck' });
    if (await deckCard.count() === 0) {
      // Find via trash icon near the deck name
      const deleteBtn = page.locator('button[title="Delete deck"]').first();
      await deleteBtn.click();
    }

    // Confirmation dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('Deck deleted')).toBeVisible();
    await expect(page.getByText('Temp Delete Deck')).not.toBeVisible();
  });
});
