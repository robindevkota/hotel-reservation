import { Page } from '@playwright/test';
import { ADMIN_USER, STAFF_USER } from '../fixtures/users';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const TOKEN_FILE = path.join(os.tmpdir(), 'rs-admin-token.json');

// ── In-process cache (covers same-worker reuse within a run) ─────────────────
let _adminToken: string | null = null;
let _adminTokenExpiry = 0;
let _staffToken: string | null = null;
let _staffTokenExpiry = 0;

async function getAuthToken(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  if (!data.accessToken) throw new Error(`Login succeeded but no accessToken in response: ${JSON.stringify(data)}`);
  return data.accessToken;
}

export async function apiLoginAsAdmin(): Promise<string> {
  // 1. In-process cache (same worker, called multiple times)
  if (_adminToken && Date.now() < _adminTokenExpiry) return _adminToken;

  // 2. Cross-worker cache written by globalSetup
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const { token, ts } = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
      // Token is valid for 15 min; we treat the file as good for 13 min
      if (token && Date.now() - ts < 13 * 60 * 1000) {
        _adminToken = token;
        _adminTokenExpiry = ts + 13 * 60 * 1000;
        return token;
      }
    }
  } catch { /* fall through to fresh login */ }

  // 3. Fresh login (last resort)
  _adminToken = await getAuthToken(ADMIN_USER.email, ADMIN_USER.password);
  _adminTokenExpiry = Date.now() + 14 * 60 * 1000;
  // Refresh the file so other workers pick it up
  try {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify({ token: _adminToken, ts: Date.now() }), 'utf8');
  } catch { /* non-fatal */ }
  return _adminToken;
}

export async function apiLoginAsStaff(): Promise<string> {
  if (_staffToken && Date.now() < _staffTokenExpiry) return _staffToken;
  _staffToken = await getAuthToken(STAFF_USER.email, STAFF_USER.password);
  _staffTokenExpiry = Date.now() + 14 * 60 * 1000;
  return _staffToken;
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

export async function loginAsAdmin(page: Page) {
  // Always get a fresh token — cached tokens may be near expiry and fail mid-test
  const token = await getAuthToken(ADMIN_USER.email, ADMIN_USER.password);
  await injectAuth(page, token, { ...ADMIN_USER, type: 'staff', id: 'test-admin-id' });
  await page.goto('/admin/dashboard');
  await page.waitForURL(/\/admin/, { timeout: 15000 });
  // Wait for Zustand hydration to settle before any further navigation
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
}

/**
 * Navigate to /register as a super_admin.
 * Zustand persist reads localStorage async — on first render user=null triggers redirect.
 * We retry up to 3 times waiting for the form to actually appear.
 */
export async function gotoRegisterPage(page: Page) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    // Poll: wait up to 8s for either the form to appear or the page to navigate away
    const deadline = Date.now() + 8000;
    let got = 'timeout';
    while (Date.now() < deadline) {
      const url = page.url();
      if (!url.includes('/register')) { got = 'redirect'; break; }
      const visible = await page.locator('input[placeholder="Admin full name"]').isVisible().catch(() => false);
      if (visible) { got = 'form'; break; }
      await page.waitForTimeout(150);
    }
    if (got === 'form') return; // success
    // redirected or timed out — wait briefly and retry
    await page.waitForTimeout(600);
  }
  // Final assertion so the test fails with a clear message if we never got the form
  await page.locator('input[placeholder="Admin full name"]').waitFor({ state: 'visible', timeout: 5000 });
}

export async function loginAsStaff(page: Page) {
  const token = await apiLoginAsStaff();
  await injectAuth(page, token, { ...STAFF_USER, type: 'staff', id: 'test-staff-id' });
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
