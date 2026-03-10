/**
 * T052 — E2E Journey 4: Ownership & Authorization
 *
 * - Log in as user A, create a deck.
 * - Log in as user B.
 * - User B attempts to navigate to user A's deck URL → sees "not found" / error page.
 * - User B's deck list shows only user B's own decks.
 *
 * Authorization is enforced by the backend (403 FORBIDDEN) and surfaced via the UI.
 */
import { test, expect } from '@playwright/test';

const TS = Date.now();
const EMAIL_A = `e2e-owner-a-${TS}@test.com`;
const EMAIL_B = `e2e-owner-b-${TS}@test.com`;
const PASSWORD = 'testpassword123';

async function register(page: Parameters<typeof test>[1] extends (...args: infer A) => unknown ? A[0] extends { page: infer P } ? P : never : never, email: string) {
  await page.goto('/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Confirm password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/');
}

async function login(page: Parameters<typeof test>[1] extends (...args: infer A) => unknown ? A[0] extends { page: infer P } ? P : never : never, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL('/');
}

test.describe('Ownership & Authorization', () => {
  let deckAId: string;

  test.beforeAll(async ({ browser }) => {
    // Register user A and create a deck
    const page = await browser.newPage();
    await register(page, EMAIL_A);

    await page.goto('/decks');
    await page.getByRole('button', { name: '+ New Deck' }).click();
    await page.getByLabel('Deck name').fill("Alice's Private Deck");
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText('Deck created!')).toBeVisible();

    await page.getByText("Alice's Private Deck").click();
    await expect(page.getByRole('button', { name: '+ Add Card' })).toBeVisible();
    deckAId = page.url().split('/decks/')[1]?.split('/')[0] ?? '';
    await page.close();

    // Register user B
    const pageB = await browser.newPage();
    await register(pageB, EMAIL_B);

    await pageB.goto('/decks');
    await pageB.getByRole('button', { name: '+ New Deck' }).click();
    await pageB.getByLabel('Deck name').fill("Bob's Deck");
    await pageB.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(pageB.getByText('Deck created!')).toBeVisible();
    await pageB.close();
  });

  test("user B cannot access user A's deck detail page", async ({ page }) => {
    await login(page, EMAIL_B);

    // Navigate directly to user A's deck URL
    await page.goto(`/decks/${deckAId}`);

    // Expect either a "Deck not found" message or a redirect away from the deck
    await expect(
      page.getByText(/Deck not found|not found|forbidden|error/i).or(
        page.locator('text=My Decks')
      ),
    ).toBeVisible({ timeout: 8000 });

    // Must NOT show Alice's deck name
    await expect(page.getByText("Alice's Private Deck")).not.toBeVisible({ timeout: 3000 });
  });

  test("user B's deck list shows only their own decks", async ({ page }) => {
    await login(page, EMAIL_B);
    await page.goto('/decks');

    await expect(page.getByText("Bob's Deck")).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("Alice's Private Deck")).not.toBeVisible();
  });
});
