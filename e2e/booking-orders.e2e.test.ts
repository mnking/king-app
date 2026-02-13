/**
 * E2E Test: Booking Order Management
 *
 * Smoke tests for critical booking order workflows.
 * Detailed API interactions are covered by integration tests (46 tests).
 *
 * Prerequisites:
 * - Backend running at http://localhost:8000
 * - Database seeded with admin user (admin/admin)
 * - Frontend running at http://127.0.0.1:5173
 */

import { test, expect } from '@playwright/test';
import { signIn, signOut, credentials } from './helpers/auth-test-utils';

test.describe('Booking Orders E2E', () => {
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
  });

  test.afterEach(async ({ page }) => {
    await signOut(page);
  });

  test('navigates to booking orders page and verifies page loads', async ({ page }) => {
    // Navigate to booking orders
    await page.goto('/dashboard/booking-orders');

    // Verify page heading
    await expect(
      page.getByRole('heading', { name: /booking order/i })
    ).toBeVisible({ timeout: 10_000 });

    // Verify "Create Booking Order" button exists
    await expect(
      page.getByRole('button', { name: /create.*booking.*order/i })
    ).toBeVisible();

    // Verify table or empty state is present
    const hasTable = await page.locator('table').count() > 0;
    const hasEmptyState = await page.getByText(/no booking orders/i).count() > 0;

    expect(hasTable || hasEmptyState).toBeTruthy();
  });

  test('opens create booking order modal', async ({ page }) => {
    await page.goto('/dashboard/booking-orders');

    // Click "Create Booking Order" button
    await page.getByRole('button', { name: /create.*booking.*order/i }).click();

    // Verify modal opens with form fields
    await expect(
      page.getByRole('dialog').or(page.locator('[role="dialog"]'))
    ).toBeVisible({ timeout: 5_000 });

    // Verify critical form fields are present
    await expect(
      page.getByLabel(/agent|forwarder/i).first()
    ).toBeVisible();

    await expect(
      page.getByLabel(/eta|arrival/i).first()
    ).toBeVisible();

    await expect(
      page.getByLabel(/vessel|ship/i).first()
    ).toBeVisible();

    await expect(
      page.getByLabel(/voyage/i).first()
    ).toBeVisible();

    // Verify "Save" or "Save as Draft" button exists
    const hasSaveButton =
      (await page.getByRole('button', { name: /save.*draft/i }).count()) > 0 ||
      (await page.getByRole('button', { name: /save/i }).count()) > 0;

    expect(hasSaveButton).toBeTruthy();

    // Close modal (click Cancel or close button)
    const cancelButton = page.getByRole('button', { name: /cancel/i });
    const closeButton = page.getByRole('button', { name: /close/i });

    if (await cancelButton.count() > 0) {
      await cancelButton.click();
    } else if (await closeButton.count() > 0) {
      await closeButton.click();
    }
  });

  test('displays booking order table columns', async ({ page }) => {
    await page.goto('/dashboard/booking-orders');

    // Wait for table to load (or empty state)
    await page.waitForTimeout(2000);

    // Check if table exists
    const tableExists = await page.locator('table').count() > 0;

    if (tableExists) {
      // Verify table headers exist
      const expectedHeaders = [
        /code|id/i,
        /agent|forwarder/i,
        /eta|arrival/i,
        /vessel|ship/i,
        /voyage/i,
        /status/i,
        /action/i,
      ];

      for (const headerPattern of expectedHeaders) {
        const headerCount = await page.locator('th').filter({ hasText: headerPattern }).count();
        expect(headerCount).toBeGreaterThan(0);
      }
    }
  });

  test('verifies responsive layout on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/dashboard/booking-orders');

    // Verify page is accessible on mobile
    await expect(
      page.getByRole('heading', { name: /booking order/i })
    ).toBeVisible({ timeout: 10_000 });

    // Verify create button is accessible
    await expect(
      page.getByRole('button', { name: /create.*booking.*order/i })
    ).toBeVisible();
  });
});
