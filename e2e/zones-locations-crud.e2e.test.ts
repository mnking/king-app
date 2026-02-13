import { test, expect } from '@playwright/test';
import { signIn, signOut, credentials } from './helpers/auth-test-utils';

test.describe('Zones & Locations CRUD E2E', () => {
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

  test('completes full zone and location CRUD workflow', async ({ page }) => {
    // Navigate to zones/locations page
    await page.goto('/zones-locations');
    await expect(page.getByRole('heading', { name: /warehouse zones/i })).toBeVisible();

    // === CREATE ZONE ===
    await page.getByRole('button', { name: /add zone/i }).first().click();
    await expect(page.getByRole('heading', { name: /create.*zone/i })).toBeVisible();

    // Fill zone form with unique test data
    const testZoneCode = `E${Date.now().toString().slice(-2)}`;
    await page.getByPlaceholder(/e\.g\.\s+GE,\s+DG/i).fill(testZoneCode);
    await page.getByPlaceholder(/enter zone name/i).fill(`E2E Zone ${testZoneCode}`);
    await page.getByPlaceholder(/enter zone description/i).fill('E2E test zone - will be deleted');

    // Submit zone form
    await page.getByRole('button', { name: 'Create Zone' }).click();

    // Verify zone creation success
    await expect(page.getByText(/zone.*created.*success/i)).toBeVisible({ timeout: 5000 });

    // Verify zone appears in list
    await expect(page.getByText(testZoneCode)).toBeVisible();

    // === CREATE LOCATIONS IN ZONE ===
    // Click on zone to view locations
    const zoneRow = page.locator(`tr:has-text("${testZoneCode}")`).first();
    await zoneRow.click();

    // Wait for locations section
    await expect(page.getByRole('heading', { name: /locations.*zone/i })).toBeVisible();

    // Create RBS location with unique test data
    await page.getByRole('button', { name: /add location/i }).click();
    await expect(page.getByRole('heading', { name: /create.*location/i })).toBeVisible();

    const timestamp = Date.now().toString().slice(-3);
    await page.locator('select[name="locationType"]').selectOption({ label: /RBS/i });
    await page.locator('input[name="row"]').fill(`R${timestamp}`);
    await page.locator('input[name="bay"]').fill(`B${timestamp}`);
    await page.locator('input[name="slot"]').fill(`S${timestamp}`);

    await page.getByRole('button', { name: /create|save location/i }).click();

    // Verify RBS location creation
    const rbsLocation = `R${timestamp}-B${timestamp}-S${timestamp}`;
    await expect(page.getByText(/location.*created.*success/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(rbsLocation)).toBeVisible();

    // Create CUSTOM location with unique test data
    await page.getByRole('button', { name: /add location/i }).click();
    await page.locator('select[name="locationType"]').selectOption({ label: /CUSTOM/i });
    await page.locator('input[name="customLabel"]').fill(`E2E${timestamp}`);

    await page.getByRole('button', { name: /create|save location/i }).click();

    // Verify custom location creation
    await expect(page.getByText(/location.*created.*success/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(`E2E${timestamp}`)).toBeVisible();

    // === UPDATE LOCATION ===
    const locationRow = page.locator(`tr:has-text("${rbsLocation}")`).first();
    await locationRow.getByRole('button', { name: /edit|update/i }).click();

    await expect(page.getByRole('heading', { name: /edit.*location/i })).toBeVisible();
    await page.locator('select[name="status"]').selectOption({ label: /inactive/i });
    await page.getByRole('button', { name: /update|save/i }).click();

    // Verify update success
    await expect(page.getByText(/location.*updated.*success/i)).toBeVisible({ timeout: 5000 });

    // === DELETE LOCATIONS (CLEANUP) ===
    // Delete RBS location
    const updatedLocationRow = page.locator(`tr:has-text("${rbsLocation}")`).first();
    await updatedLocationRow.getByRole('button', { name: /delete/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /confirm|delete/i }).click();

    await expect(page.getByText(/location.*deleted.*success/i)).toBeVisible({ timeout: 5000 });

    // Delete CUSTOM location
    const customLocationRow = page.locator(`tr:has-text("E2E${timestamp}")`).first();
    await customLocationRow.getByRole('button', { name: /delete/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /confirm|delete/i }).click();

    await expect(page.getByText(/location.*deleted.*success/i)).toBeVisible({ timeout: 5000 });

    // === DELETE ZONE (CLEANUP) ===
    await page.goto('/zones-locations');

    const zoneToDelete = page.locator(`tr:has-text("${testZoneCode}")`).first();
    await zoneToDelete.getByRole('button', { name: /delete/i }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /confirm|delete/i }).click();

    // Verify zone deletion success
    await expect(page.getByText(/zone.*deleted.*success/i)).toBeVisible({ timeout: 5000 });
  });

  test('validates zone code format', async ({ page }) => {
    await page.goto('/zones-locations');
    await expect(page.getByRole('heading', { name: /warehouse zones/i })).toBeVisible();

    await page.getByRole('button', { name: /add zone/i }).first().click();
    await expect(page.getByRole('heading', { name: /create.*zone/i })).toBeVisible();

    // Try invalid zone code (too long - should be 1-2 uppercase letters)
    await page.getByPlaceholder(/e\.g\.\s+GE,\s+DG/i).fill('ABC');
    await page.getByPlaceholder(/enter zone name/i).fill('Invalid Zone');
    await page.getByRole('button', { name: 'Create Zone' }).click();

    // Verify validation error
    await expect(page.getByText(/1-2.*characters|invalid.*format/i)).toBeVisible();
  });

  test('validates RBS location format', async ({ page }) => {
    await page.goto('/zones-locations');
    await expect(page.getByRole('heading', { name: /warehouse zones/i })).toBeVisible();

    // Create a test zone first
    await page.getByRole('button', { name: /add zone/i }).first().click();
    const testZoneCode = `T${Date.now().toString().slice(-2)}`;
    await page.getByPlaceholder(/e\.g\.\s+GE,\s+DG/i).fill(testZoneCode);
    await page.getByPlaceholder(/enter zone name/i).fill(`Test Zone ${testZoneCode}`);
    await page.getByRole('button', { name: 'Create Zone' }).click();
    await expect(page.getByText(/zone.*created.*success/i)).toBeVisible({ timeout: 5000 });

    // Click on the test zone
    const testZone = page.locator(`tr:has-text("${testZoneCode}")`).first();
    await testZone.click();
    await expect(page.getByRole('heading', { name: /locations.*zone/i })).toBeVisible();

    // Try to add location with invalid RBS format
    await page.getByRole('button', { name: /add location/i }).click();
    await page.locator('select[name="locationType"]').selectOption({ label: /RBS/i });

    await page.locator('input[name="row"]').fill('999'); // Invalid - must be R + 2 digits
    await page.locator('input[name="bay"]').fill('999'); // Invalid - must be B + 2 digits
    await page.locator('input[name="slot"]').fill('999'); // Invalid - must be S + 2 digits

    await page.getByRole('button', { name: /create|save location/i }).click();

    // Verify validation error
    await expect(page.getByText(/invalid.*format|must start with/i)).toBeVisible();

    // Cleanup: Go back and delete test zone
    await page.goto('/zones-locations');
    const zoneToDelete = page.locator(`tr:has-text("${testZoneCode}")`).first();
    await zoneToDelete.getByRole('button', { name: /delete/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /confirm|delete/i }).click();
  });

  test('prevents duplicate zone codes', async ({ page }) => {
    await page.goto('/zones-locations');
    await expect(page.getByRole('heading', { name: /warehouse zones/i })).toBeVisible();

    // Create first test zone
    await page.getByRole('button', { name: /add zone/i }).first().click();
    const testZoneCode = `D${Date.now().toString().slice(-2)}`;
    await page.getByPlaceholder(/e\.g\.\s+GE,\s+DG/i).fill(testZoneCode);
    await page.getByPlaceholder(/enter zone name/i).fill(`First Zone ${testZoneCode}`);
    await page.getByRole('button', { name: 'Create Zone' }).click();
    await expect(page.getByText(/zone.*created.*success/i)).toBeVisible({ timeout: 5000 });

    // Try to create duplicate zone with same code
    await page.getByRole('button', { name: /add zone/i }).first().click();
    await page.getByPlaceholder(/e\.g\.\s+GE,\s+DG/i).fill(testZoneCode);
    await page.getByPlaceholder(/enter zone name/i).fill('Duplicate Zone');
    await page.getByRole('button', { name: 'Create Zone' }).click();

    // Verify error message
    await expect(page.getByText(/already exists|duplicate/i)).toBeVisible({ timeout: 5000 });

    // Cleanup: Delete test zone
    await page.goto('/zones-locations');
    const zoneToDelete = page.locator(`tr:has-text("${testZoneCode}")`).first();
    await zoneToDelete.getByRole('button', { name: /delete/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /confirm|delete/i }).click();
  });

  test('filters zones by status', async ({ page }) => {
    await page.goto('/zones-locations');
    await expect(page.getByRole('heading', { name: /warehouse zones/i })).toBeVisible();

    // Create an active test zone
    await page.getByRole('button', { name: /add zone/i }).first().click();
    const testZoneCode = `F${Date.now().toString().slice(-2)}`;
    await page.getByPlaceholder(/e\.g\.\s+GE,\s+DG/i).fill(testZoneCode);
    await page.getByPlaceholder(/enter zone name/i).fill(`Filter Test ${testZoneCode}`);
    await page.locator('select[name="status"]').selectOption('active');
    await page.getByRole('button', { name: 'Create Zone' }).click();
    await expect(page.getByText(/zone.*created.*success/i)).toBeVisible({ timeout: 5000 });

    // Apply active status filter
    await page.getByLabel(/status|filter/i).selectOption('active');
    await page.waitForTimeout(1000);

    // Verify test zone appears in filtered results
    await expect(page.getByText(testZoneCode)).toBeVisible();

    // Cleanup: Delete test zone
    const zoneToDelete = page.locator(`tr:has-text("${testZoneCode}")`).first();
    await zoneToDelete.getByRole('button', { name: /delete/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /confirm|delete/i }).click();
  });

  test('searches locations within a zone', async ({ page }) => {
    await page.goto('/zones-locations');
    await expect(page.getByRole('heading', { name: /warehouse zones/i })).toBeVisible();

    // Create test zone
    await page.getByRole('button', { name: /add zone/i }).first().click();
    const testZoneCode = `S${Date.now().toString().slice(-2)}`;
    await page.getByPlaceholder(/e\.g\.\s+GE,\s+DG/i).fill(testZoneCode);
    await page.getByPlaceholder(/enter zone name/i).fill(`Search Test ${testZoneCode}`);
    await page.getByRole('button', { name: 'Create Zone' }).click();
    await expect(page.getByText(/zone.*created.*success/i)).toBeVisible({ timeout: 5000 });

    // Click on test zone
    const testZone = page.locator(`tr:has-text("${testZoneCode}")`).first();
    await testZone.click();
    await expect(page.getByRole('heading', { name: /locations.*zone/i })).toBeVisible();

    // Create test location
    await page.getByRole('button', { name: /add location/i }).click();
    const timestamp = Date.now().toString().slice(-3);
    await page.locator('select[name="locationType"]').selectOption({ label: /RBS/i });
    await page.locator('input[name="row"]').fill(`R${timestamp}`);
    await page.locator('input[name="bay"]').fill(`B${timestamp}`);
    await page.locator('input[name="slot"]').fill(`S${timestamp}`);
    await page.getByRole('button', { name: /create|save location/i }).click();
    await expect(page.getByText(/location.*created.*success/i)).toBeVisible({ timeout: 5000 });

    // Search for the test location
    const searchInput = page.getByPlaceholder(/search.*location/i);
    if (await searchInput.isVisible()) {
      await searchInput.fill(`R${timestamp}`);
      await page.waitForTimeout(500);

      // Verify search results contain the test location
      await expect(page.getByText(`R${timestamp}-B${timestamp}-S${timestamp}`)).toBeVisible();
    }

    // Cleanup: Delete test zone (which will cascade delete locations)
    await page.goto('/zones-locations');
    const zoneToDelete = page.locator(`tr:has-text("${testZoneCode}")`).first();
    await zoneToDelete.getByRole('button', { name: /delete/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /confirm|delete/i }).click();
  });
});
