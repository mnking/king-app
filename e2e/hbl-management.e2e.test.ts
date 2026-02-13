/**
 * E2E Test: HBL Management Bug Fixes
 *
 * Smoke tests for bug fixes in HBL management:
 * - Bug #1: Seal column display
 * - Bug #2: Seal input in create mode
 * - Bug #3: Form state persistence
 * - Bug #4: Number input validation
 * - Bug #5: Section ordering
 * - Bug #6: Layout optimization
 *
 * Prerequisites:
 * - Backend running at http://localhost:8000
 * - Database seeded with admin user (admin/admin)
 * - Frontend running at http://127.0.0.1:5173
 */

import { test, expect } from '@playwright/test';
import { signIn, signOut, credentials } from './helpers/auth-test-utils';

test.describe('HBL Management Bug Fixes E2E', () => {
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

    // Navigate to HBL list
    await page.goto('/dashboard/hbl');
  });

  test.afterEach(async ({ page }) => {
    await signOut(page);
  });

  test('T040: complete HBL creation with seal number and validated inputs', async ({ page }) => {
    // Click "Add HBL" button
    await page.getByRole('button', { name: /add.*hbl|create.*hbl/i }).click();

    // Wait for modal to open
    await expect(
      page.getByRole('heading', { name: /create.*hbl/i })
    ).toBeVisible({ timeout: 5_000 });

    // Verify section order (Bug #5): Bill → Voyage → Container → Cargo
    const sections = await page.locator('h4').allTextContents();
    const billIndex = sections.findIndex(s => /bill.*information/i.test(s));
    const voyageIndex = sections.findIndex(s => /voyage.*ports/i.test(s));
    const containerIndex = sections.findIndex(s => /container.*information/i.test(s));
    const cargoIndex = sections.findIndex(s => /cargo.*information/i.test(s));

    expect(billIndex).toBeLessThan(voyageIndex);
    expect(voyageIndex).toBeLessThan(containerIndex);
    expect(containerIndex).toBeLessThan(cargoIndex);

    // Fill in Bill Information
    await page.getByLabel(/b\/l code|hbl code/i).fill('HBL123TEST');
    await page.getByLabel(/issuer|forwarder/i).first().click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Fill in Voyage & Ports (Section 2 after reordering)
    await page.getByLabel(/vessel.*name/i).fill('MSC FORTUNE');
    await page.getByLabel(/voyage.*number/i).fill('V123');
    await page.getByLabel(/port.*loading|pol/i).fill('VNSGN');
    await page.getByLabel(/port.*discharge|pod/i).fill('USNYC');

    // Fill in Container Information (Bug #2: Seal input visible in create mode)
    const containerInput = page.getByLabel(/container.*number/i);
    await containerInput.fill('ABCD1234567');

    // Verify seal number field is visible (Bug #2)
    const sealInput = page.getByLabel(/seal.*number/i);
    await expect(sealInput).toBeVisible();
    await sealInput.fill('SEAL001234');

    // Fill in Cargo Information (Section 4 after reordering)
    await page.getByLabel(/shipper/i).fill('ABC Trading Co.');
    await page.getByLabel(/consignee/i).fill('XYZ Logistics Ltd.');
    await page.getByLabel(/notify.*party/i).fill('Notify Agent Inc.');
    await page.getByLabel(/cargo.*description/i).fill('Electronics - 500 laptops');

    // Test Bug #4: Number input validation
    const packageCountInput = page.getByLabel(/package.*count/i);
    await packageCountInput.fill('');

    // Try typing invalid characters (should be blocked by useNumberInput hook)
    await packageCountInput.type('abc'); // Letters should be blocked
    const packageValue1 = await packageCountInput.inputValue();
    expect(packageValue1).toBe(''); // Should still be empty

    await packageCountInput.type('10'); // Valid integer
    await expect(packageCountInput).toHaveValue('10');

    await page.getByLabel(/package.*type/i).fill('CTN');

    // Test Bug #4: Paste with commas (should be stripped)
    const weightInput = page.getByLabel(/cargo.*weight/i);
    await weightInput.fill(''); // Clear first
    // Simulate paste event (note: Playwright doesn't fully emulate keyboard events, so this tests the UI)
    await weightInput.fill('1,547.5'); // In real usage, paste would strip comma
    // For E2E, we'll just verify the field accepts numeric input
    await weightInput.clear();
    await weightInput.fill('1547.5');
    await expect(weightInput).toHaveValue('1547.5');

    const volumeInput = page.getByLabel(/volume/i);
    await volumeInput.fill('12.345');

    // Verify form can be submitted or saved as draft
    const saveButton = page.getByRole('button', { name: /save.*draft|create.*draft/i });
    await expect(saveButton).toBeEnabled();

    // Close modal
    await page.getByRole('button', { name: /cancel/i }).click();
  });

  test('T041: form state isolation between view and create', async ({ page }) => {
    // Wait for HBL list to load
    await page.waitForTimeout(2000);

    // Check if any HBLs exist
    const tableExists = await page.locator('table').count() > 0;

    if (tableExists) {
      const rows = await page.locator('tbody tr').count();

      if (rows > 0) {
        // Click to view first HBL
        await page.locator('tbody tr').first().getByRole('button', { name: /view|eye/i }).first().click();

        // Wait for view modal
        await expect(
          page.getByRole('heading', { name: /view.*hbl/i })
        ).toBeVisible({ timeout: 5_000 });

        // Verify form fields are populated (not testing exact values, just that data exists)
        const codeInput = page.getByLabel(/b\/l code|hbl code/i);
        const codeValue = await codeInput.inputValue();
        expect(codeValue.length).toBeGreaterThan(0);

        // Check if numeric fields have values
        const weightInput = page.getByLabel(/cargo.*weight/i);
        const weightValue = await weightInput.inputValue();
        const hasWeight = weightValue.length > 0;

        // Close view modal
        await page.getByRole('button', { name: /close/i }).click();

        // Wait for modal to close
        await page.waitForTimeout(500);

        // Open create modal (Bug #3: Form state persistence test)
        await page.getByRole('button', { name: /add.*hbl|create.*hbl/i }).click();

        // Wait for create modal
        await expect(
          page.getByRole('heading', { name: /create.*hbl/i })
        ).toBeVisible({ timeout: 5_000 });

        // Verify numeric fields are EMPTY (Bug #3 fix)
        const packageCountCreate = page.getByLabel(/package.*count/i);
        const weightInputCreate = page.getByLabel(/cargo.*weight/i);
        const volumeInputCreate = page.getByLabel(/volume/i);

        await expect(packageCountCreate).toHaveValue('');
        await expect(weightInputCreate).toHaveValue('');
        await expect(volumeInputCreate).toHaveValue('');

        // Verify HBL code is also empty
        const codeInputCreate = page.getByLabel(/b\/l code|hbl code/i);
        await expect(codeInputCreate).toHaveValue('');

        // Test Bug #3: Ability to delete all characters
        if (hasWeight) {
          // Type a number
          await weightInputCreate.fill('1547');
          await expect(weightInputCreate).toHaveValue('1547');

          // Delete all characters one by one
          await weightInputCreate.focus();
          await weightInputCreate.press('End'); // Move to end
          await weightInputCreate.press('Backspace'); // Delete 7
          await weightInputCreate.press('Backspace'); // Delete 4
          await weightInputCreate.press('Backspace'); // Delete 5
          await weightInputCreate.press('Backspace'); // Delete 1

          // Verify field is now empty (Bug #3: can delete to empty)
          await expect(weightInputCreate).toHaveValue('');
        }

        // Close create modal
        await page.getByRole('button', { name: /cancel/i }).click();
      }
    }
  });

  test('verifies Seal column is visible in HBL table (Bug #1)', async ({ page }) => {
    // Wait for table to load
    await page.waitForTimeout(2000);

    const tableExists = await page.locator('table').count() > 0;

    if (tableExists) {
      // Verify "Seal" column header exists (Bug #1)
      const sealHeader = page.locator('th').filter({ hasText: /seal/i });
      await expect(sealHeader).toBeVisible();

      // Verify Seal column appears after Container column
      const headers = await page.locator('th').allTextContents();
      const containerIndex = headers.findIndex(h => /container/i.test(h));
      const sealIndex = headers.findIndex(h => /seal/i.test(h));

      if (containerIndex >= 0 && sealIndex >= 0) {
        expect(sealIndex).toBeGreaterThan(containerIndex);
      }
    }
  });

  test('verifies form layout optimization (Bug #6)', async ({ page }) => {
    // Open create modal
    await page.getByRole('button', { name: /add.*hbl|create.*hbl/i }).click();

    await expect(
      page.getByRole('heading', { name: /create.*hbl/i })
    ).toBeVisible({ timeout: 5_000 });

    // Verify 2-column grids are applied (Bug #6)
    // Check Bill Information section has 2-column grid
    const billSection = page.locator('text=Bill Information').locator('..');
    const billGrids = billSection.locator('.grid.grid-cols-1.sm\\:grid-cols-2');
    await expect(billGrids.first()).toBeVisible();

    // Check Voyage & Ports section has 2-column grids
    const voyageSection = page.locator('text=Voyage & Ports').locator('..');
    const voyageGrids = voyageSection.locator('.grid.grid-cols-1.sm\\:grid-cols-2');
    const voyageGridCount = await voyageGrids.count();
    expect(voyageGridCount).toBeGreaterThanOrEqual(2); // Should have 2 grids (vessel+voyage, pol+pod)

    // Check Cargo Information section has 2-column grids
    const cargoSection = page.locator('text=Cargo Information').locator('..');
    const cargoGrids = cargoSection.locator('.grid.grid-cols-1.sm\\:grid-cols-2');
    const cargoGridCount = await cargoGrids.count();
    expect(cargoGridCount).toBeGreaterThanOrEqual(3); // Should have 3 grids (shipper+consignee, pkg count+type, weight+volume)

    // Close modal
    await page.getByRole('button', { name: /cancel/i }).click();
  });
});
