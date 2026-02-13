import { test, expect } from '@playwright/test';

import {
  attemptInvalidLogin,
  credentials,
  loginSelectors,
  signIn,
  signOut,
} from './helpers/auth-test-utils';

test.describe('Auth E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.context().clearPermissions();
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('completes primary login and logout flow', async ({ page }) => {
    await signIn(page, credentials);

    const refreshToken = await page.evaluate(() => localStorage.getItem('auth.refresh_token'));
    expect(refreshToken).toBeTruthy();

    await signOut(page);

    const clearedToken = await page.evaluate(() => localStorage.getItem('auth.refresh_token'));
    expect(clearedToken).toBeNull();
  });

  test('shows an error when login credentials are invalid', async ({ page }) => {
    const alert = await attemptInvalidLogin(page, {
      username: 'invaliduser',
      password: 'wrong-password',
    });

    await expect(alert).toContainText('Incorrect email/username or password');
    await expect(page.getByRole('heading', { name: loginSelectors.signInHeading })).toBeVisible();
  });

  test('persists session across reloads', async ({ page }) => {
    await signIn(page, credentials);

    await page.reload();
    await expect(page.getByRole('heading', { name: loginSelectors.dashboardHeading })).toBeVisible();

    await signOut(page);
  });

  test('allows admin user to access protected admin panel', async ({ page }) => {
    await signIn(page, credentials);

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: loginSelectors.adminHeading })).toBeVisible();

    await signOut(page);
  });

  test('refreshes session using refresh token', async ({ page }) => {
    await signIn(page, credentials);

    const {
      beforeRefresh,
      refreshed,
      afterRefresh,
      stillAuthenticated,
      storageToken,
      durationMs,
    } = await page.evaluate(async () => {
      const { useAuthStore } = await import('/src/stores/useAuthStore.ts');
      const state = useAuthStore.getState();
      const prevAccessToken = state.accessToken;
      const start = performance.now();
      const didRefresh = await state.refreshAccessToken();
      const duration = performance.now() - start;
      const nextState = useAuthStore.getState();
      return {
        beforeRefresh: prevAccessToken,
        refreshed: didRefresh,
        afterRefresh: nextState.accessToken,
        stillAuthenticated: nextState.isAuthenticated,
        storageToken: window.localStorage.getItem('auth.refresh_token'),
        durationMs: duration,
      };
    });

    expect(beforeRefresh).toBeTruthy();
    expect(refreshed).toBeTruthy();
    expect(afterRefresh).toBeTruthy();
    expect(stillAuthenticated).toBeTruthy();
    expect(storageToken).toBeTruthy();
    expect(durationMs).toBeLessThan(500);
    test.info().annotations.push({
      type: 'refreshDurationMs',
      description: durationMs.toFixed(2),
    });
    console.info('[auth-refresh]', durationMs.toFixed(2));

    await signOut(page);
  });

});
