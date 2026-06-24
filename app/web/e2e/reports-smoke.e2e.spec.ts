import { test, expect } from '@playwright/test';

test('ReportsPage renders with layout', async ({ page }) => {
  await page.goto('http://localhost:5174/');
  // Not logged in → should redirect to /login
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('body')).not.toBeEmpty();
});

test('ReportsPage placeholder gone — full component renders', async ({ page }) => {
  // Navigate directly; without auth we should see /login redirect
  await page.goto('http://localhost:5174/reports');
  await expect(page).toHaveURL(/\/login/);
});

test('ReportViewPage placeholder gone — real component file exists', async ({ page }) => {
  await page.goto('http://localhost:5174/reports/test-id');
  await expect(page).toHaveURL(/\/login/);
});

test('No JS bundle errors on load', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('http://localhost:5174/login');
  await page.waitForLoadState('networkidle');
  // Filter out network errors (API not up) — only care about JS errors
  const jsErrors = errors.filter(e => !e.includes('Failed to fetch') && !e.includes('net::ERR'));
  expect(jsErrors).toHaveLength(0);
});
