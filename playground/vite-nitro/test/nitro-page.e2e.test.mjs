import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const playgroundDirectory = resolve(testDirectory, '..');
const host = '127.0.0.1';
const port = '3211';
const origin = `http://${host}:${port}`;

let nitroServer;
const browserTestOptions = { timeout: 15_000 };

test.before(async () => {
	await runCommand('bun', ['run', 'build'], playgroundDirectory);

	nitroServer = spawn('node', ['.output/server/index.mjs'], {
		cwd: playgroundDirectory,
		env: {
			...process.env,
			HOST: host,
			NITRO_HOST: host,
			NITRO_PORT: port,
			PORT: port,
		},
		stdio: ['ignore', 'pipe', 'pipe'],
	});

	nitroServer.stdout?.on('data', () => undefined);
	nitroServer.stderr?.on('data', () => undefined);

	await waitForServer(origin);
});

test.after(async () => {
	if (!nitroServer || nitroServer.killed) {
		return;
	}

	nitroServer.kill('SIGTERM');
	await Promise.race([once(nitroServer, 'exit'), delay(5_000)]);

	if (!nitroServer.killed) {
		nitroServer.kill('SIGKILL');
	}
});

test('Nitro page SSR renders nested context flow and hydrates child updates', browserTestOptions, async () => {
	const response = await fetch(origin);
	assert.equal(response.status, 200);

	const html = await response.text();
	assert.match(html, /<radiant-context-flow-shell>/);
	assert.match(html, /<radiant-context-flow-leaf>/);
	assert.match(html, /<radiant-slot-studio-board><section[^>]*class="component-card component-card--studio"/);
	assert.match(html, /Context: Nitro SSR context \/ 2/);
	assert.match(html, /<script type="application\/json" data-playground-state>.*<\/script>/);
	assert.doesNotMatch(html, /data-playground-state="/);
	assert.match(
		html,
		/<script type="application\/json" data-hydration data-context-key="context">\{"label":"Nitro SSR context","level":2\}<\/script>/,
	);

	await withBrowserPage(async (page) => {
		await gotoPlayground(page);
		await waitForContextSummary(page, 'Context: Nitro SSR context / 2');

		const contextShell = page.locator('radiant-context-flow-shell').first();
		await contextShell.getByRole('button', { name: 'Increase context level' }).click();

		await waitForContextSummary(page, 'Context: Nitro SSR context / 3');
	});
});

test('Nitro page-level controls update client and route state after clicks', browserTestOptions, async () => {
	await withBrowserPage(async (page) => {
		await gotoPlayground(page);

		const clientStatePanel = getPanel(page, 'Client state');
		await waitForLocatorText(clientStatePanel.locator('strong'), '0');

		await clientStatePanel.getByRole('button', { name: 'Increment', exact: true }).click();
		await clientStatePanel.getByRole('button', { name: 'Increment', exact: true }).click();
		await waitForLocatorText(clientStatePanel.locator('strong'), '2');

		const nitroRoutePanel = getPanel(page, 'Nitro route');
		await waitForLocatorText(nitroRoutePanel.locator('.status'), 'Status: idle');
		await waitForLocatorText(nitroRoutePanel.locator('p').nth(1), 'Nitro endpoint has not been called yet.');
		await waitForLocatorText(nitroRoutePanel.locator('p').nth(2), 'Server time: n/a');

		await nitroRoutePanel.getByRole('button', { name: 'Fetch /api/hello' }).click();

		await waitForLocatorText(nitroRoutePanel.locator('.status'), 'Status: ready');
		await waitForLocatorText(nitroRoutePanel.locator('p').nth(1), 'Hello from Nitro via Vite + Nitro playground');
		await waitForLocatorTextMatch(nitroRoutePanel.locator('p').nth(2), /^Server time: (?!n\/a).+/);
	});
});

test('Nitro playground component cards react to their own button clicks', browserTestOptions, async () => {
	await withBrowserPage(async (page) => {
		await gotoPlayground(page);

		const liveCounter = page.locator('radiant-component-counter').first();
		await waitForLocatorText(liveCounter.locator('.component-metric'), 'Count: 2');

		await liveCounter.getByRole('button', { name: 'Increment', exact: true }).click();
		await waitForLocatorText(liveCounter.locator('.component-metric'), 'Count: 3');

		await liveCounter.getByRole('button', { name: 'Decrement', exact: true }).click();
		await liveCounter.getByRole('button', { name: 'Decrement', exact: true }).click();
		await waitForLocatorText(liveCounter.locator('.component-metric'), 'Count: 1');

		const serverCard = page.locator('radiant-component-server-card').first();
		await waitForLocatorText(serverCard.locator('.component-status'), 'Status: idle');
		await waitForLocatorText(
			serverCard.locator('.component-copy').nth(1),
			'Press the button to fetch the Nitro endpoint from inside a RadiantComponent.',
		);

		await serverCard.getByRole('button', { name: 'Fetch from Nitro' }).click();

		await waitForLocatorText(serverCard.locator('.component-status'), 'Status: ready');
		await waitForLocatorText(
			serverCard.locator('.component-copy').nth(1),
			'Hello from Nitro via Vite + Nitro playground',
		);
		await waitForLocatorTextMatch(serverCard.locator('.component-meta'), /^Server time: (?!n\/a).+/);
	});
});

test('Nitro playground studio board composes slots and propagates context updates', browserTestOptions, async () => {
	await withBrowserPage(async (page) => {
		await gotoPlayground(page);

		const studioBoard = page.locator('radiant-slot-studio-board').first();
		await waitForLocatorText(
			studioBoard.locator('h3[slot="heading"]'),
			'Launch board with projected planning rails',
		);
		await waitForLocatorText(
			studioBoard.locator('.studio-summary'),
			'Design systems is steering slot composition in build mode with 3 commits queued.',
		);
		await waitForLocatorText(
			studioBoard.locator('.studio-slot-meta'),
			'@querySlot sees 2 body regions, sidebar ready, footer ready. Projected custom element: radiant-component-counter.',
		);
		await waitForLocatorText(
			studioBoard.locator('.studio-insight[data-kind="stage"] .studio-insight__value'),
			'Build',
		);
		await waitForLocatorText(
			studioBoard.locator('.studio-insight[data-kind="tempo"] .studio-insight__value'),
			'Calm',
		);
		await waitForLocatorText(
			studioBoard.locator('.studio-insight[data-kind="commits"] .studio-insight__value'),
			'3 synced',
		);

		const projectedCounter = studioBoard.locator('radiant-component-counter').first();
		await waitForLocatorText(projectedCounter.locator('.component-metric').first(), 'Count: 5');
		await projectedCounter.getByRole('button', { name: 'Increment', exact: true }).click();
		await waitForLocatorText(projectedCounter.locator('.component-metric').first(), 'Count: 6');

		await studioBoard.getByRole('button', { name: 'Advance stage' }).click();
		await studioBoard.getByRole('button', { name: 'Rotate tempo' }).click();
		await studioBoard.getByRole('button', { name: 'Log commit' }).click();

		await waitForLocatorText(
			studioBoard.locator('.studio-insight[data-kind="stage"] .studio-insight__value'),
			'Review',
		);
		await waitForLocatorText(
			studioBoard.locator('.studio-insight[data-kind="tempo"] .studio-insight__value'),
			'Live',
		);
		await waitForLocatorText(
			studioBoard.locator('.studio-insight[data-kind="commits"] .studio-insight__value'),
			'4 synced',
		);
		await waitForLocatorText(
			studioBoard.locator('.studio-summary'),
			'Design systems is steering slot composition in review mode with 4 commits queued.',
		);
	});
});

test(
	'Nitro SSR fragment controls swap rendered components and hydrate fetched markup',
	browserTestOptions,
	async () => {
		await withBrowserPage(async (page) => {
			await gotoPlayground(page);

			const ssrPanel = getPanel(page, 'SSR route');
			await waitForLocatorText(ssrPanel.locator('.status'), 'Status: ready');
			await waitForLocatorAttribute(
				ssrPanel.locator('.ssr-preview'),
				'data-tag-name',
				'radiant-component-counter',
			);
			await waitForLocatorText(
				ssrPanel.locator('[data-generated-at]'),
				await nonPlaceholderGeneratedAt(ssrPanel),
			);
			await waitForLocatorTextMatch(ssrPanel.locator('.ssr-html'), /SSR counter rendered in Nitro/);

			const previewCounter = ssrPanel.locator('.ssr-preview radiant-component-counter');
			await waitForLocatorText(previewCounter.locator('.component-metric').first(), 'Count: 6');

			await ssrPanel.getByRole('button', { name: 'Fetch server-card fragment' }).click();

			await waitForLocatorText(ssrPanel.locator('.status'), 'Status: ready');
			await waitForLocatorAttribute(
				ssrPanel.locator('.ssr-preview'),
				'data-tag-name',
				'radiant-component-server-card',
			);
			await waitForLocatorTextMatch(ssrPanel.locator('.ssr-html'), /radiant-component-server-card/);

			const previewServerCard = ssrPanel.locator('.ssr-preview radiant-component-server-card');
			await waitForLocatorText(previewServerCard.locator('.component-status'), 'Status: idle');
			await previewServerCard.getByRole('button', { name: 'Fetch from Nitro' }).click();
			await waitForLocatorText(previewServerCard.locator('.component-status'), 'Status: ready');
			await waitForLocatorText(
				previewServerCard.locator('.component-copy').nth(1),
				'Hello from Nitro via Vite + Nitro playground',
			);
			await waitForLocatorTextMatch(previewServerCard.locator('.component-meta'), /^Server time: (?!n\/a).+/);

			await ssrPanel.getByRole('button', { name: 'Fetch counter fragment' }).click();

			await waitForLocatorAttribute(
				ssrPanel.locator('.ssr-preview'),
				'data-tag-name',
				'radiant-component-counter',
			);
			await waitForLocatorTextMatch(ssrPanel.locator('.ssr-html'), /SSR counter rendered in Nitro/);
			await waitForLocatorText(previewCounter.locator('.component-metric').first(), 'Count: 6');

			await previewCounter.getByRole('button', { name: 'Increment', exact: true }).click();
			await waitForLocatorText(previewCounter.locator('.component-metric').first(), 'Count: 7');
		});
	},
);

async function waitForContextSummary(page, expectedText) {
	try {
		await page.waitForFunction(
			(expected) =>
				document.querySelector('radiant-context-flow-leaf [data-ref="context-summary"]')?.textContent ===
				expected,
			expectedText,
		);
	} catch (error) {
		const diagnostics = await page.evaluate(() => ({
			body: document.body.innerHTML,
			leafText:
				document.querySelector('radiant-context-flow-leaf [data-ref="context-summary"]')?.textContent ?? null,
			shellHtml: document.querySelector('radiant-context-flow-shell')?.innerHTML ?? null,
		}));
		console.log(`context-summary-timeout:${JSON.stringify({ expectedText, ...diagnostics }, null, 2)}`);
		throw error;
	}
}

async function withBrowserPage(run) {
	const browser = await chromium.launch({ headless: true });

	try {
		const page = await browser.newPage();
		attachPageDiagnostics(page);
		await run(page);
	} finally {
		await browser.close();
	}
}

function attachPageDiagnostics(page) {
	page.on('console', (message) => {
		console.log(`browser:console:${message.type()}:${message.text()}`);
	});
	page.on('pageerror', (error) => {
		console.log(`browser:pageerror:${error.stack}`);
	});
	page.on('requestfailed', (request) => {
		console.log(`browser:requestfailed:${request.url()}:${request.failure()?.errorText}`);
	});
}

async function gotoPlayground(page) {
	await page.goto(origin, { waitUntil: 'load' });
	await page.waitForSelector('main.shell');
	await page.waitForSelector('radiant-context-flow-shell');
}

function getPanel(page, headingName) {
	return page.locator('section.panel').filter({
		has: page.getByRole('heading', { name: headingName, exact: true }),
	});
}

async function waitForLocatorText(locator, expectedText, timeout = 5_000) {
	const actualText = await poll(async () => normalizeText(await locator.textContent()), {
		description: `text ${JSON.stringify(expectedText)}`,
		isDone: (value) => value === expectedText,
		timeout,
	});

	assert.equal(actualText, expectedText);
}

async function waitForLocatorTextMatch(locator, expectedPattern, timeout = 5_000) {
	const actualText = await poll(async () => normalizeText(await locator.textContent()), {
		description: `text matching ${expectedPattern}`,
		isDone: (value) => expectedPattern.test(value),
		timeout,
	});

	assert.match(actualText, expectedPattern);
}

async function waitForLocatorAttribute(locator, attributeName, expectedValue, timeout = 5_000) {
	const actualValue = await poll(async () => (await locator.getAttribute(attributeName)) ?? '', {
		description: `${attributeName} ${JSON.stringify(expectedValue)}`,
		isDone: (value) => value === expectedValue,
		timeout,
	});

	assert.equal(actualValue, expectedValue);
}

async function nonPlaceholderGeneratedAt(ssrPanel) {
	return poll(async () => normalizeText(await ssrPanel.locator('[data-generated-at]').textContent()), {
		description: 'non-placeholder generated timestamp',
		isDone: (value) => /^Generated at: (?!n\/a).+/.test(value),
		timeout: 5_000,
	});
}

function normalizeText(value) {
	return value?.replace(/\s+/g, ' ').trim() ?? '';
}

async function poll(readValue, options) {
	const timeout = options.timeout ?? 5_000;
	const interval = options.interval ?? 50;
	const deadline = Date.now() + timeout;
	let lastValue = '';

	for (;;) {
		lastValue = await readValue();

		if (options.isDone(lastValue)) {
			return lastValue;
		}

		if (Date.now() >= deadline) {
			throw new Error(`Timed out waiting for ${options.description}. Last value: ${JSON.stringify(lastValue)}`);
		}

		await delay(interval);
	}
}

async function runCommand(command, args, cwd) {
	await new Promise((resolvePromise, rejectPromise) => {
		const child = spawn(command, args, {
			cwd,
			env: process.env,
			stdio: 'pipe',
		});

		let stderr = '';

		child.stderr?.on('data', (chunk) => {
			stderr += chunk.toString();
		});

		child.on('exit', (code) => {
			if (code === 0) {
				resolvePromise(undefined);
				return;
			}

			rejectPromise(new Error(`${command} ${args.join(' ')} failed with code ${code}: ${stderr}`));
		});
		child.on('error', rejectPromise);
	});
}

async function waitForServer(url) {
	for (let attempt = 0; attempt < 80; attempt += 1) {
		try {
			const response = await fetch(url);

			if (response.ok) {
				return;
			}
		} catch {}

		await delay(250);
	}

	throw new Error(`Timed out waiting for Nitro server at ${url}`);
}
