import { test, expect } from '@playwright/test';
import { signIn, signOut } from './helpers/auth-test-utils';

test.describe('Zones & Locations Toast Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.context().clearPermissions();
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('positions standard toast bottom-right and confirm dialog centered', async ({ page }) => {
    await signIn(page);
    await page.goto('/zones-locations');

    await expect(
      page.getByRole('heading', { name: 'Warehouse Zones' }),
    ).toBeVisible();

    // Create a test zone first
    await page.getByRole('button', { name: /add zone/i }).first().click();
    const testZoneCode = `P${Date.now().toString().slice(-2)}`;
    await page.getByPlaceholder(/e\.g\.\s+GE,\s+DG/i).fill(testZoneCode);
    await page.getByPlaceholder(/enter zone name/i).fill(`Toast Test ${testZoneCode}`);
    await page.getByRole('button', { name: 'Create Zone' }).click();
    await expect(page.getByText(/zone.*created.*success/i)).toBeVisible({ timeout: 10_000 });

    // Create a location in the zone to prevent deletion
    const zoneRow = page.locator(`tr:has-text("${testZoneCode}")`).first();
    await zoneRow.click();
    await expect(page.getByRole('heading', { name: /locations.*zone/i })).toBeVisible();

    await page.getByRole('button', { name: /add location/i }).click();
    const timestamp = Date.now().toString().slice(-3);
    await page.locator('select[name="locationType"]').selectOption({ label: /RBS/i });
    await page.locator('input[name="row"]').fill(`R${timestamp}`);
    await page.locator('input[name="bay"]').fill(`B${timestamp}`);
    await page.locator('input[name="slot"]').fill(`S${timestamp}`);
    await page.getByRole('button', { name: /create|save location/i }).click();
    await expect(page.getByText(/location.*created.*success/i)).toBeVisible({ timeout: 10_000 });

    // Go back to zones list
    await page.goto('/zones-locations');

    // Now try to delete zone with location (should show error toast)
    const testZoneRow = page.locator(`tr:has-text("${testZoneCode}")`).first();
    await expect(testZoneRow).toBeVisible();

    const actionsButton = testZoneRow.locator('button.p-1.rounded-full');
    await actionsButton.hover();

    const deleteAction = testZoneRow.getByRole('button', { name: 'Delete Zone' });
    await expect(deleteAction).toBeVisible();
    await deleteAction.click();

    const toastMessage = page
      .getByText('Cannot delete zone', { exact: false })
      .first();
    await expect(toastMessage).toBeVisible({ timeout: 10_000 });

    const toastMetrics = await toastMessage.evaluate((element) => {
      const metrics = [];
      let current = element;

      while (current) {
        const rect = current.getBoundingClientRect();
        metrics.push({
          tag: current.tagName,
          className: current.className,
          role: current.getAttribute('role'),
          id: current.id,
          distanceRight: window.innerWidth - rect.right,
          distanceBottom: window.innerHeight - rect.bottom,
        });
        current = current.parentElement;
      }

      return metrics;
    });

    const targetMetrics =
      toastMetrics.find((metric) => metric.distanceRight >= 0 && metric.distanceBottom >= 0) ?? toastMetrics[0];
    const distanceRight = targetMetrics?.distanceRight ?? 0;
    const distanceBottom = targetMetrics?.distanceBottom ?? 0;

    expect(distanceRight).toBeGreaterThanOrEqual(0);
    expect(distanceRight).toBeLessThanOrEqual(40);
    expect(distanceBottom).toBeGreaterThanOrEqual(0);
    expect(distanceBottom).toBeLessThanOrEqual(40);

    await page.evaluate(async () => {
      const { toastService } = await import('/src/shared/services/toast/toast.service.tsx');
      toastService.dismissAll();
    });

    await page.getByRole('button', { name: /Add zone/i }).click();

    await expect(page.getByRole('heading', { name: 'Create New Zone' })).toBeVisible();

    await page
      .getByPlaceholder('e.g. GE, DG (1-2 uppercase letters)')
      .fill('QA');
    await page.getByPlaceholder('Enter zone name').fill('QA Toast Zone');
    await page
      .getByPlaceholder('Enter zone description (optional)')
      .fill('Toast verification zone');
    await page.locator('select[name="status"]').selectOption('active');

    await page.getByRole('button', { name: 'Cancel' }).click();

    const confirmDialog = page.getByRole('dialog');
    await expect(confirmDialog).toBeVisible();

    const centerOffsets = await confirmDialog.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        offsetX: Math.abs(window.innerWidth / 2 - (rect.left + rect.width / 2)),
        offsetY: Math.abs(window.innerHeight / 2 - (rect.top + rect.height / 2)),
      };
    });

    expect(centerOffsets.offsetX).toBeLessThanOrEqual(40);
    expect(centerOffsets.offsetY).toBeLessThanOrEqual(40);

    await confirmDialog.getByRole('button', { name: 'Confirm' }).click();
    await expect(confirmDialog).toBeHidden();

    // Cleanup: Delete location and zone
    await page.goto('/zones-locations');
    const cleanupZoneRow = page.locator(`tr:has-text("${testZoneCode}")`).first();
    await cleanupZoneRow.click();
    await expect(page.getByRole('heading', { name: /locations.*zone/i })).toBeVisible();

    // Delete location first
    const locationRow = page.locator('tbody tr').first();
    if (await locationRow.isVisible()) {
      await locationRow.getByRole('button', { name: /delete/i }).click();
      await page.getByRole('dialog').getByRole('button', { name: /confirm|delete/i }).click();
      await expect(page.getByText(/location.*deleted.*success/i)).toBeVisible({ timeout: 5000 });
    }

    // Now delete zone
    await page.goto('/zones-locations');
    const zoneToDelete = page.locator(`tr:has-text("${testZoneCode}")`).first();
    await zoneToDelete.getByRole('button', { name: /delete/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: /confirm|delete/i }).click();

    await signOut(page);
  });
});
