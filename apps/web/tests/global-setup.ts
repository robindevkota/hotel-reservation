/**
 * global-setup.ts
 *
 * Runs ONCE before all test workers. Logs in as admin and writes the token
 * to a temp file so every worker can reuse it without hitting the auth rate limit.
 * Skips the login if a fresh token already exists on disk (< 13 min old).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
export const TOKEN_FILE = path.join(os.tmpdir(), 'rs-admin-token.json');
const TOKEN_TTL_MS = 13 * 60 * 1000; // 13 minutes

async function getAdminToken(): Promise<string> {
  const email = process.env.ADMIN_EMAIL || 'superadmin@royalsuites.com';
  const password = process.env.ADMIN_PASSWORD || 'RoyalAdmin@123';

  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Admin login failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  if (!data.accessToken) throw new Error(`No accessToken in login response: ${JSON.stringify(data)}`);
  return data.accessToken;
}

export default async function globalSetup() {
  // Reuse existing token if still fresh
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const { token, ts } = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
      if (token && Date.now() - ts < TOKEN_TTL_MS) {
        console.log('[global-setup] Reusing cached admin token (age:', Math.round((Date.now() - ts) / 1000), 's)');
        return;
      }
    }
  } catch { /* fall through */ }

  const token = await getAdminToken();
  fs.writeFileSync(TOKEN_FILE, JSON.stringify({ token, ts: Date.now() }), 'utf8');
  console.log('[global-setup] Admin token cached to', TOKEN_FILE);
}
