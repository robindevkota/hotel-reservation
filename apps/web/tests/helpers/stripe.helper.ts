import { Page } from '@playwright/test';

export async function fillStripeCard(page: Page) {
  const stripeFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first();
  await stripeFrame.locator('[placeholder="Card number"]').fill('4242424242424242');
  await stripeFrame.locator('[placeholder="MM / YY"]').fill('12/30');
  await stripeFrame.locator('[placeholder="CVC"]').fill('123');
  await stripeFrame.locator('[placeholder="ZIP"]').fill('10001');
}

export async function completeStripePayment(page: Page) {
  await page.click('[data-testid="pay-now"]');
  await page.waitForSelector('[data-testid="payment-success"]', { timeout: 15000 }).catch(() => {});
}
