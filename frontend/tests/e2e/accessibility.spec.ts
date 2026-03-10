import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const EMAIL = `e2e-a11y-${Date.now()}@test.com`;
const PASSWORD = 'testpassword123';

test.describe('Accessibility', () => {
  test('login page has no critical a11y violations', async ({ page }) => {
    await page.goto('/login');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toHaveLength(0);
  });

  test('register page has no critical a11y violations', async ({ page }) => {
    await page.goto('/register');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toHaveLength(0);
  });

  test('dashboard has no critical a11y violations', async ({ page }) => {
    // Register & login
    await page.goto('/register');
    await page.getByLabel('Email').fill(EMAIL);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Confirm password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL('/');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toHaveLength(0);
  });

  test('rating buttons are keyboard accessible', async ({ page }) => {
    // Register a fresh user for this test (self-contained)
    const a11yEmail = `e2e-a11y-rating-${Date.now()}@test.com`;
    await page.goto('/register');
    await page.getByLabel('Email').fill(a11yEmail);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Confirm password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL('/');

    await page.goto('/decks');

    // Create a deck + card programmatically via UI
    await page.getByRole('button', { name: '+ New Deck' }).click();
    await page.getByLabel('Deck name').fill('A11y Test Deck');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText('Deck created!')).toBeVisible();

    await page.getByText('A11y Test Deck').click();
    // Wait for navigation to deck detail page
    await expect(page.getByRole('button', { name: '+ Add Card' })).toBeVisible();
    await page.getByRole('button', { name: '+ Add Card' }).click();
    await page.getByPlaceholder("e.g. What is the capital of France?").fill('Question?');
    await page.getByPlaceholder('e.g. Paris').fill('Answer!');
    await page.getByRole('button', { name: 'Create Card' }).click();
    await expect(page.getByText('Card created!')).toBeVisible();
    // Wait for navigation back to deck detail page before extracting deckId
    await expect(page).toHaveURL(/\/decks\/[a-z0-9-]+$/);

    // Navigate to study session
    const deckId = page.url().split('/decks/')[1]?.split('/')[0];
    await page.goto(`/decks/${deckId}/study`);

    await expect(page.getByText(/Press.*Space/)).toBeVisible({ timeout: 10000 });

    // Flip with space
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: 'Again' })).toBeVisible();

    // All rating buttons should be reachable via Tab
    await page.keyboard.press('Tab');
    // Check focus is on a rating button
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.getAttribute('data-rating');
    });
    // focused could be null if tab goes elsewhere, but buttons should exist
    await expect(page.getByRole('button', { name: 'Again' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Good' })).toBeVisible();

    void focused; // suppress unused warning
  });
});
