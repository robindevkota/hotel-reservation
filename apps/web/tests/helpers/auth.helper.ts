import { Page, expect } from '@playwright/test';
import { ADMIN_USER, STAFF_USER } from '../fixtures/users';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function getAuthToken(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  return data.accessToken;
}

async function injectAuth(page: Page, token: string, user: any) {
  await page.addInitScript(
    ({ token, user }) => {
      window.localStorage.setItem('accessToken', token);
      window.localStorage.setItem(
        'royal-suites-auth',
        JSON.stringify({
          state: { user, accessToken: token },
          version: 0,
        })
      );
    },
    { token, user }
  );
}

export async function loginAsStaff(page: Page) {
  const token = await getAuthToken(STAFF_USER.email, STAFF_USER.password);
  await injectAuth(page, token, { ...STAFF_USER, type: 'staff', id: 'test-staff-id' });
  await page.goto('/admin/dashboard');
  await page.waitForURL(/\/admin/, { timeout: 15000 });
}

export async function loginAsAdmin(page: Page) {
  const token = await getAuthToken(ADMIN_USER.email, ADMIN_USER.password);
  await injectAuth(page, token, { ...ADMIN_USER, type: 'staff', id: 'test-admin-id' });
  await page.goto('/admin/dashboard');
  await page.waitForURL(/\/admin/, { timeout: 15000 });
}

export async function registerStaff(page: Page, name: string, email: string, password: string, role = 'staff') {
  await page.goto('/register');
  await page.fill('input[placeholder="Your full name"]', name);
  await page.fill('input[type="email"]', email);
  await page.fill('input[placeholder="Min. 8 characters"]', password);
  const select = page.locator('select');
  await select.selectOption(role);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/, { timeout: 15000 });
}

export async function apiLoginAsAdmin() {
  return getAuthToken(ADMIN_USER.email, ADMIN_USER.password);
}

export async function apiLoginAsStaff() {
  return getAuthToken(STAFF_USER.email, STAFF_USER.password);
}
