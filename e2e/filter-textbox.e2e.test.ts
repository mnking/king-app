/**
 * E2E Test: FilterTextbox Component
 *
 * Tests for manual-trigger filtering, clear control, and theme consistency.
 * Component is tested in the context of Booking Order Management.
 *
 * Prerequisites:
 * - Backend running at http://localhost:8000
 * - Database seeded with admin user (admin/admin)
 * - Frontend running at http://127.0.0.1:5173
 */

import { test, expect } from '@playwright/test';
import { signIn, signOut, credentials } from './helpers/auth-test-utils';

test.describe('FilterTextbox E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Clear state
    await page.context().clearCookies();
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Sign in
    await signIn(page, credentials);

    // Navigate to booking orders page
    await page.goto('/booking-orders');
    await expect(
      page.getByRole('heading', { name: /booking order/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test.afterEach(async ({ page }) => {
    await signOut(page);
  });

  test('displays filter textbox with dynamic placeholder', async ({ page }) => {
    // Verify FilterTextbox exists with proper placeholder
    const searchInput = page.getByRole('textbox', { name: /search/i });
    await expect(searchInput).toBeVisible();

    // Verify dynamic placeholder shows field names
    const placeholder = await searchInput.getAttribute('placeholder');
    expect(placeholder).toMatch(/booking.*number|vessel.*code|voyage/i);
  });

  test('typing in textbox does not trigger filtering (manual-trigger only)', async ({ page }) => {
    // Wait for initial data to load
    await page.waitForTimeout(2000);

    // Get initial table state
    const initialRowCount = await page.locator('table tbody tr').count();

    // Type in search box without clicking search icon
    const searchInput = page.getByRole('textbox', { name: /search/i });
    await searchInput.fill('TESTFILTER');

    // Wait a bit to ensure no auto-search happens
    await page.waitForTimeout(1000);

    // Verify table hasn't changed (no filtering occurred)
    const rowCountAfterTyping = await page.locator('table tbody tr').count();
    expect(rowCountAfterTyping).toBe(initialRowCount);

    // Verify input has the typed value
    await expect(searchInput).toHaveValue('TESTFILTER');
  });

  test('clicking search icon triggers filtering', async ({ page }) => {
    // Wait for initial data to load
    await page.waitForTimeout(2000);

    // Type in search box
    const searchInput = page.getByRole('textbox', { name: /search/i });
    await searchInput.fill('BO-2025');

    // Get table state before search
    const initialRowCount = await page.locator('table tbody tr').count();

    // Click search icon
    const searchButton = page.getByRole('button', { name: /search/i });
    await searchButton.click();

    // Wait for filtering to complete
    await page.waitForTimeout(1500);

    // Verify table state changed (filtering occurred)
    const rowCountAfterSearch = await page.locator('table tbody tr').count();
    expect(rowCountAfterSearch).not.toBe(initialRowCount);

    // Verify input background is highlighted (active state)
    const inputBgClass = await searchInput.getAttribute('class');
    expect(inputBgClass).toMatch(/bg-blue-50|dark:bg-blue-900/);
  });

  test('pressing Enter key triggers filtering', async ({ page }) => {
    // Wait for initial data to load
    await page.waitForTimeout(2000);

    // Type in search box and press Enter
    const searchInput = page.getByRole('textbox', { name: /search/i });
    await searchInput.fill('BO-2025');
    await searchInput.press('Enter');

    // Wait for filtering to complete
    await page.waitForTimeout(1500);

    // Verify input background is highlighted (active state)
    const inputBgClass = await searchInput.getAttribute('class');
    expect(inputBgClass).toMatch(/bg-blue-50|dark:bg-blue-900/);
  });

  test('clear button resets filter and table', async ({ page }) => {
    // Wait for initial data to load
    await page.waitForTimeout(2000);

    // Get initial row count (all data)
    const initialRowCount = await page.locator('table tbody tr').count();

    // Perform search
    const searchInput = page.getByRole('textbox', { name: /search/i });
    await searchInput.fill('BO-2025');

    const searchButton = page.getByRole('button', { name: /search/i });
    await searchButton.click();

    // Wait for filtering
    await page.waitForTimeout(1500);

    // Verify clear button appears
    const clearButton = page.getByRole('button', { name: /clear/i });
    await expect(clearButton).toBeVisible();

    // Click clear button
    await clearButton.click();

    // Wait for data to reload
    await page.waitForTimeout(1500);

    // Verify input is cleared
    await expect(searchInput).toHaveValue('');

    // Verify clear button is hidden
    await expect(clearButton).not.toBeVisible();

    // Verify table shows all data again
    const rowCountAfterClear = await page.locator('table tbody tr').count();
    expect(rowCountAfterClear).toBe(initialRowCount);

    // Verify input background is normal (not highlighted)
    const inputBgClass = await searchInput.getAttribute('class');
    expect(inputBgClass).not.toMatch(/bg-blue-50|dark:bg-blue-900/);
  });

  test('auto-clear when text manually deleted', async ({ page }) => {
    // Wait for initial data to load
    await page.waitForTimeout(2000);

    // Get initial row count
    const initialRowCount = await page.locator('table tbody tr').count();

    // Perform search
    const searchInput = page.getByRole('textbox', { name: /search/i });
    await searchInput.fill('BO-2025');

    const searchButton = page.getByRole('button', { name: /search/i });
    await searchButton.click();

    // Wait for filtering
    await page.waitForTimeout(1500);

    // Manually delete all text (select all + delete)
    await searchInput.click();
    await searchInput.press('Control+A'); // Or Meta+A on Mac
    await searchInput.press('Backspace');

    // Wait for auto-clear to trigger
    await page.waitForTimeout(1500);

    // Verify table shows all data again (same as clicking clear button)
    const rowCountAfterDelete = await page.locator('table tbody tr').count();
    expect(rowCountAfterDelete).toBe(initialRowCount);

    // Verify input background is normal (not highlighted)
    const inputBgClass = await searchInput.getAttribute('class');
    expect(inputBgClass).not.toMatch(/bg-blue-50|dark:bg-blue-900/);
  });

  test('search icon is always enabled', async ({ page }) => {
    // Verify search button is enabled when input is empty
    const searchButton = page.getByRole('button', { name: /search/i });
    await expect(searchButton).toBeEnabled();

    // Type in search box
    const searchInput = page.getByRole('textbox', { name: /search/i });
    await searchInput.fill('BO-2025');

    // Verify search button is still enabled
    await expect(searchButton).toBeEnabled();

    // Click search
    await searchButton.click();
    await page.waitForTimeout(1000);

    // Verify search button is still enabled after search
    await expect(searchButton).toBeEnabled();

    // Clear input
    const clearButton = page.getByRole('button', { name: /clear/i });
    await clearButton.click();
    await page.waitForTimeout(500);

    // Verify search button is still enabled after clear
    await expect(searchButton).toBeEnabled();
  });

  test('clear button shows/hides correctly', async ({ page }) => {
    const searchInput = page.getByRole('textbox', { name: /search/i });
    const clearButton = page.getByRole('button', { name: /clear/i });

    // Clear button should not be visible when input is empty
    await expect(clearButton).not.toBeVisible();

    // Type in search box
    await searchInput.fill('A');

    // Clear button should appear
    await expect(clearButton).toBeVisible();

    // Type more
    await searchInput.fill('AB');

    // Clear button should still be visible
    await expect(clearButton).toBeVisible();

    // Clear via button
    await clearButton.click();

    // Clear button should disappear
    await expect(clearButton).not.toBeVisible();
  });

  test('verifies dark theme rendering', async ({ page }) => {
    // Wait for initial data load
    await page.waitForTimeout(2000);

    // Enable dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(500);

    // Verify FilterTextbox is visible
    const searchInput = page.getByRole('textbox', { name: /search/i });
    await expect(searchInput).toBeVisible();

    // Perform search to trigger active state
    await searchInput.fill('BO-2025');
    const searchButton = page.getByRole('button', { name: /search/i });
    await searchButton.click();

    await page.waitForTimeout(1000);

    // Verify dark mode classes are applied
    const inputBgClass = await searchInput.getAttribute('class');
    expect(inputBgClass).toContain('dark:bg-blue-900');
  });

  test('verifies light theme rendering', async ({ page }) => {
    // Wait for initial data load
    await page.waitForTimeout(2000);

    // Enable light mode
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(500);

    // Verify FilterTextbox is visible
    const searchInput = page.getByRole('textbox', { name: /search/i });
    await expect(searchInput).toBeVisible();

    // Perform search to trigger active state
    await searchInput.fill('BO-2025');
    const searchButton = page.getByRole('button', { name: /search/i });
    await searchButton.click();

    await page.waitForTimeout(1000);

    // Verify light mode classes are applied
    const inputBgClass = await searchInput.getAttribute('class');
    expect(inputBgClass).toContain('bg-blue-50');
  });

  test('verifies active state visual feedback', async ({ page }) => {
    const searchInput = page.getByRole('textbox', { name: /search/i });

    // Initially, input should have normal background
    let inputBgClass = await searchInput.getAttribute('class');
    expect(inputBgClass).not.toMatch(/bg-blue-50|dark:bg-blue-900/);

    // Type and search
    await searchInput.fill('BO-2025');
    const searchButton = page.getByRole('button', { name: /search/i });
    await searchButton.click();

    await page.waitForTimeout(1000);

    // After search, input should have blue background
    inputBgClass = await searchInput.getAttribute('class');
    expect(inputBgClass).toMatch(/bg-blue-50|dark:bg-blue-900/);

    // Clear the filter
    const clearButton = page.getByRole('button', { name: /clear/i });
    await clearButton.click();

    await page.waitForTimeout(500);

    // After clear, background should return to normal
    inputBgClass = await searchInput.getAttribute('class');
    expect(inputBgClass).not.toMatch(/bg-blue-50|dark:bg-blue-900/);
  });

  test('verifies pagination resets to page 1 when searching', async ({ page }) => {
    // Wait for initial data to load
    await page.waitForTimeout(2000);

    // Check if pagination exists (only if there are enough records)
    const paginationExists = await page.getByRole('button', { name: /next/i }).count() > 0;

    if (paginationExists) {
      // Go to page 2 if possible
      const nextButton = page.getByRole('button', { name: /next/i });
      if (await nextButton.isEnabled()) {
        await nextButton.click();
        await page.waitForTimeout(1000);
      }

      // Perform search
      const searchInput = page.getByRole('textbox', { name: /search/i });
      await searchInput.fill('BO-2025');

      const searchButton = page.getByRole('button', { name: /search/i });
      await searchButton.click();

      await page.waitForTimeout(1500);

      // Verify pagination shows page 1 (check if "Previous" button is disabled)
      const prevButton = page.getByRole('button', { name: /previous/i });
      if (await prevButton.count() > 0) {
        await expect(prevButton).toBeDisabled();
      }
    }
  });
});
