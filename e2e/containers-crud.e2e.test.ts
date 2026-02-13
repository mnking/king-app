import { test, expect } from '@playwright/test';
import { signIn, signOut, credentials } from './helpers/auth-test-utils';

test.describe.skip('Container CRUD E2E - SKIPPED: /containers route not implemented', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.context().clearPermissions();
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await signIn(page, credentials);
  });

  test.afterEach(async ({ page }) => {
    await signOut(page);
  });

  test('completes full container CRUD workflow', async ({ page }) => {
    // Navigate to containers page
    await page.goto('/containers');
    await expect(page.getByRole('heading', { name: /containers/i })).toBeVisible();

    // Create new container
    await page.getByRole('button', { name: /add container/i }).click();
    await expect(page.getByRole('heading', { name: /create.*container/i })).toBeVisible();

    // Fill container form
    const testContainerNumber = `TEST${Date.now()}`;
    await page.getByLabel(/container number/i).fill(testContainerNumber);
    await page.getByLabel(/container type/i).selectOption({ label: /20.*standard/i });

    // Submit form
    await page.getByRole('button', { name: /create|save/i }).click();

    // Verify success toast
    await expect(page.getByText(/container.*created.*success/i)).toBeVisible({ timeout: 5000 });

    // Verify container appears in list
    await page.goto('/containers');
    await expect(page.getByText(testContainerNumber)).toBeVisible({ timeout: 5000 });

    // Update container
    const containerRow = page.locator(`tr:has-text("${testContainerNumber}")`).first();
    await containerRow.getByRole('button', { name: /edit|update/i }).click();

    await expect(page.getByRole('heading', { name: /edit.*container/i })).toBeVisible();
    await page.getByLabel(/status/i).selectOption({ label: /inactive|unavailable/i });
    await page.getByRole('button', { name: /update|save/i }).click();

    // Verify update success
    await expect(page.getByText(/container.*updated.*success/i)).toBeVisible({ timeout: 5000 });

    // Delete container
    await page.goto('/containers');
    const updatedRow = page.locator(`tr:has-text("${testContainerNumber}")`).first();
    await updatedRow.getByRole('button', { name: /delete/i }).click();

    // Confirm deletion
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /confirm|delete/i }).click();

    // Verify deletion success
    await expect(page.getByText(/container.*deleted.*success/i)).toBeVisible({ timeout: 5000 });

    // Verify container no longer in list
    await page.goto('/containers');
    await expect(page.getByText(testContainerNumber)).not.toBeVisible();
  });

  test('validates container number format', async ({ page }) => {
    await page.goto('/containers');
    await page.getByRole('button', { name: /add container/i }).click();

    // Try invalid container number
    await page.getByLabel(/container number/i).fill('INVALID');
    await page.getByLabel(/container type/i).selectOption({ index: 1 });
    await page.getByRole('button', { name: /create|save/i }).click();

    // Verify validation error
    await expect(page.getByText(/invalid.*format|must be.*characters/i)).toBeVisible();
  });

  test('prevents duplicate container numbers', async ({ page }) => {
    await page.goto('/containers');

    // Get first existing container number
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    const existingNumber = await firstRow.locator('td').first().textContent();

    if (!existingNumber) {
      test.skip();
      return;
    }

    // Try to create duplicate
    await page.getByRole('button', { name: /add container/i }).click();
    await page.getByLabel(/container number/i).fill(existingNumber);
    await page.getByLabel(/container type/i).selectOption({ index: 1 });
    await page.getByRole('button', { name: /create|save/i }).click();

    // Verify error message
    await expect(page.getByText(/already exists|duplicate/i)).toBeVisible({ timeout: 5000 });
  });

  test('filters containers by type', async ({ page }) => {
    await page.goto('/containers');

    // Apply type filter
    await page.getByLabel(/type|filter/i).selectOption({ label: /20.*standard/i });

    // Wait for results
    await page.waitForTimeout(1000);

    // Verify filtered results
    const rows = page.locator('tbody tr');
    const count = await rows.count();

    if (count > 0) {
      const firstRowType = await rows.first().locator('td').nth(1).textContent();
      expect(firstRowType).toContain('20');
    }
  });

  test('searches containers by number', async ({ page }) => {
    await page.goto('/containers');

    // Get first container number
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    const containerNumber = await firstRow.locator('td').first().textContent();

    if (!containerNumber) {
      test.skip();
      return;
    }

    // Search for container
    await page.getByPlaceholder(/search/i).fill(containerNumber.substring(0, 6));
    await page.waitForTimeout(500);

    // Verify search results
    await expect(page.getByText(containerNumber)).toBeVisible();
  });
});
