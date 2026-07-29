import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'http://host.docker.internal:3000';

test.describe('Dashboard', () => {
	test('should load homepage successfully', async ({ page }) => {
		await page.goto(BASE_URL);
		await expect(page).toHaveTitle(/.*/);
		await expect(page.getByRole('heading', { name: 'OpenLaputa Infrastructure', exact: true })).toBeVisible();
	});

	test('should display service status cards', async ({ page }) => {
		await page.goto(BASE_URL);
		await expect(page.getByText('Service Status', { exact: true })).toBeVisible();
		await expect(page.getByText('caddy', { exact: true }).first()).toBeVisible();
		await expect(page.getByText('viewer', { exact: true }).first()).toBeVisible();
	});

	test('should display navigation cards', async ({ page }) => {
		await page.goto(BASE_URL);
		await expect(page.getByText('Navigation', { exact: true })).toBeVisible();
		await expect(page.getByRole('link', { name: '📁 File Browser Browse repo' })).toBeVisible();
		await expect(page.getByRole('link', { name: '🐳 Docker Images Container' })).toBeVisible();
		await expect(page.getByRole('link', { name: '⚡ Services Local service' })).toBeVisible();
		await expect(page.getByRole('link', { name: '🔄 CI/CD Pipeline GitHub' })).toBeVisible();
	});

	test('should display CI build info', async ({ page }) => {
		await page.goto(BASE_URL);
		await expect(page.getByText('Latest CI Build', { exact: true })).toBeVisible();
	});

	test('should display recent activity', async ({ page }) => {
		await page.goto(BASE_URL);
		await expect(page.getByText('Recent Activity', { exact: true })).toBeVisible();
	});

	test('should navigate to browse page', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.getByRole('link', { name: '📁 File Browser' }).click();
		await expect(page).toHaveURL(`${BASE_URL}/browse`);
		await expect(page.getByText('Repository Files', { exact: true })).toBeVisible();
	});

	test('should navigate to images page', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.getByRole('link', { name: '🐳 Docker Images' }).click();
		await expect(page).toHaveURL(`${BASE_URL}/images`);
		await expect(page.getByRole('heading', { name: 'Docker Images', exact: true })).toBeVisible();
	});

	test('should navigate to services page', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.getByRole('link', { name: '⚡ Services' }).click();
		await expect(page).toHaveURL(`${BASE_URL}/services`);
		await expect(page.getByRole('heading', { name: 'Services', exact: true })).toBeVisible();
	});

	test('should navigate to CI page', async ({ page }) => {
		await page.goto(BASE_URL);
		await page.getByRole('link', { name: '🔄 CI/CD Pipeline' }).click();
		await expect(page).toHaveURL(`${BASE_URL}/ci`);
		await expect(page.getByRole('heading', { name: 'CI/CD Pipeline', exact: true })).toBeVisible();
	});

	test('should have trigger build button', async ({ page }) => {
		await page.goto(BASE_URL);
		await expect(page.getByRole('button', { name: 'Trigger Build' })).toBeVisible();
	});
});

test.describe('Browse Page', () => {
	test('should load file tree', async ({ page }) => {
		await page.goto(`${BASE_URL}/browse`);
		await expect(page.getByText('Repository Files', { exact: true })).toBeVisible();
	});

	test('should display file content when clicked', async ({ page }) => {
		await page.goto(`${BASE_URL}/browse`);
		// Click on the caddy directory first
		await page.waitForSelector('button:has-text("caddy")', { timeout: 10000 });
		await page.click('button:has-text("caddy")');
		// Wait for the directory to expand and show Caddyfile
		await page.waitForSelector('button:has-text("Caddyfile")', { timeout: 10000 });
		await page.click('button:has-text("Caddyfile")');
		await expect(page.locator('pre')).toBeVisible();
	});
});

test.describe('Services Page', () => {
	test('should display service cards', async ({ page }) => {
		await page.goto(`${BASE_URL}/services`);
		await expect(page.getByRole('heading', { name: 'Services', exact: true })).toBeVisible();
		await expect(page.getByText('caddy', { exact: true }).first()).toBeVisible();
		await expect(page.getByText('viewer', { exact: true }).first()).toBeVisible();
	});

	test('should show service status indicators', async ({ page }) => {
		await page.goto(`${BASE_URL}/services`);
		await expect(page.getByText('running').first()).toBeVisible();
	});
});

test.describe('CI Page', () => {
	test('should display CI pipeline info', async ({ page }) => {
		await page.goto(`${BASE_URL}/ci`);
		await expect(page.getByRole('heading', { name: 'CI/CD Pipeline', exact: true })).toBeVisible();
		await expect(page.getByText('Recent Builds', { exact: true })).toBeVisible();
		await expect(page.getByText('Pipeline Flow', { exact: true })).toBeVisible();
	});

	test('should have trigger build button', async ({ page }) => {
		await page.goto(`${BASE_URL}/ci`);
		await expect(page.getByRole('button', { name: 'Trigger Build' })).toBeVisible();
	});
});

test.describe('Images Page', () => {
	test('should display image list', async ({ page }) => {
		await page.goto(`${BASE_URL}/images`);
		await expect(page.getByRole('heading', { name: 'Docker Images', exact: true })).toBeVisible();
	});
});
