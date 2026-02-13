import { expect, type Page } from '@playwright/test';

type Credentials = {
  username: string;
  password: string;
};

export const credentials: Credentials = {
  username: process.env.AUTH_USERNAME ?? 'admin',
  password: process.env.AUTH_PASSWORD ?? 'admin',
};

export const loginSelectors = {
  username: {
    label: 'Email or Username',
    placeholder: 'Email address or username',
  },
  password: {
    label: 'Password',
  },
  signIn: 'Sign In',
  signOut: 'Sign Out',
  signInHeading: 'Sign in to your account',
  dashboardHeading: 'Dashboard',
  adminHeading: 'Admin Panel',
};

export async function fillCredentials(page: Page, creds: Credentials) {
  const usernameInput = page
    .getByLabel(loginSelectors.username.label, { exact: true })
    .or(page.getByPlaceholder(loginSelectors.username.placeholder));
  const passwordInput = page
    .getByLabel(loginSelectors.password.label, { exact: true })
    .or(page.getByPlaceholder(loginSelectors.password.label));

  await usernameInput.fill(creds.username);
  await passwordInput.fill(creds.password);
}

export async function openUserMenu(page: Page) {
  const candidates = [
    page.getByRole('button', { name: /User$/ }),
    page.getByRole('button', { name: /Admin/i }),
    page.getByRole('button', { name: /SeaTos/i }),
  ];

  for (const candidate of candidates) {
    if ((await candidate.count()) > 0) {
      try {
        await candidate.first().click({ timeout: 3_000 });
        if (await page.getByRole('button', { name: loginSelectors.signOut }).isVisible()) {
          return;
        }
      } catch {
        // Try next candidate
      }
    }
  }

  throw new Error('Failed to open user menu');
}

export async function signIn(page: Page, creds: Credentials = credentials) {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: loginSelectors.signInHeading }),
  ).toBeVisible({ timeout: 15_000 });

  await fillCredentials(page, creds);

  await Promise.all([
    page.waitForURL(/dashboard/, { timeout: 15_000 }),
    page.getByRole('button', { name: loginSelectors.signIn }).click(),
  ]);

  await expect(
    page.getByRole('heading', { name: loginSelectors.dashboardHeading }),
  ).toBeVisible();
}

export async function attemptInvalidLogin(page: Page, creds: Credentials) {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: loginSelectors.signInHeading }),
  ).toBeVisible({ timeout: 15_000 });

  await fillCredentials(page, creds);
  await page.getByRole('button', { name: loginSelectors.signIn }).click();
  const alert = page.getByRole('alert');
  await expect(alert).toBeVisible({ timeout: 10_000 });
  return alert;
}

export async function signOut(page: Page) {
  await openUserMenu(page);
  await page.getByRole('button', { name: loginSelectors.signOut }).click();
  await expect(
    page.getByRole('heading', { name: loginSelectors.signInHeading }),
  ).toBeVisible();
}
