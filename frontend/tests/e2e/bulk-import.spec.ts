/**
 * T050 — E2E Journey 2: Bulk CSV Import
 *
 * Login → Open deck → Import 20-row CSV → Verify 20 imported
 * Also test: malformed CSV (missing back) → skipped count shown
 *
 * Uses `waitForResponse()` for the import API call.
 */
import { test, expect, type Page } from '@playwright/test';

const EMAIL = `e2e-import-${Date.now()}@test.com`;
const PASSWORD = 'testpassword123';

async function loginUser(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/');
}

/** Build a CSV string with `rows` valid data rows. */
function makeCsv(rows: number): string {
  const lines = ['front,back'];
  for (let i = 1; i <= rows; i++) {
    lines.push(`Front ${i},Back ${i}`);
  }
  return lines.join('\n');
}

test.describe('Bulk CSV Import', () => {
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
    await page.getByLabel('Deck name').fill('Import Test Deck');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText('Deck created!')).toBeVisible();

    // Navigate to deck and capture ID
    await page.getByText('Import Test Deck').click();
    await expect(page.getByRole('button', { name: '+ Add Card' })).toBeVisible();
    deckId = page.url().split('/decks/')[1]?.split('/')[0] ?? '';

    await page.close();
  });

  test('import 20-row CSV creates 20 cards', async ({ page }) => {
    await loginUser(page);
    await page.goto(`/decks/${deckId}`);

    // Open import modal
    await page.getByRole('button', { name: 'Import CSV' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Attach 20-row CSV via file input
    const csvContent = makeCsv(20);
    await page
      .getByRole('dialog')
      .locator('input[type="file"]')
      .setInputFiles({
        name: 'cards.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent),
      });

    // Wait for backend import response
    const importPromise = page.waitForResponse(
      (resp) => resp.url().includes('/import') && resp.status() === 200,
      { timeout: 15000 },
    );
    await page.getByRole('dialog').getByRole('button', { name: 'Import' }).click();
    await importPromise;

    // Modal shows "20 cards imported"
    await expect(page.getByText(/20 cards imported/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Done' }).click();
  });

  test('malformed CSV (missing back fields) shows skipped count', async ({ page }) => {
    await loginUser(page);
    await page.goto(`/decks/${deckId}`);

    await page.getByRole('button', { name: 'Import CSV' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // 1 valid row, 2 rows with empty back field
    const badCsv = 'front,back\nFront A,Back A\nFront B,\nFront C,';
    await page
      .getByRole('dialog')
      .locator('input[type="file"]')
      .setInputFiles({
        name: 'bad.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(badCsv),
      });

    const importPromise = page.waitForResponse(
      (resp) => resp.url().includes('/import') && resp.status() === 200,
      { timeout: 15000 },
    );
    await page.getByRole('dialog').getByRole('button', { name: 'Import' }).click();
    await importPromise;

    // Should show both the imported count and skipped count
    await expect(page.getByText(/1 card/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/skipped/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Done' }).click();
  });
});
