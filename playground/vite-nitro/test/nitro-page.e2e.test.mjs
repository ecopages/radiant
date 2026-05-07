import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
	browserTestOptions,
	getPanel,
	normalizeText,
	poll,
	runCommand,
	startServer,
	stopServer,
	waitForLocatorAttribute,
	waitForLocatorText,
	waitForLocatorTextMatch,
	withBrowserPage,
} from '../../test-support/playwright-e2e.mjs';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const playgroundDirectory = resolve(testDirectory, '..');
const host = '127.0.0.1';
const port = '3211';
const origin = `http://${host}:${port}`;

let nitroServer;

test.before(async () => {
	await runCommand('bun', ['run', 'build'], playgroundDirectory);
	nitroServer = await startServer({
		command: 'node',
		args: [resolve(playgroundDirectory, '.output/server/index.mjs')],
		cwd: playgroundDirectory,
		env: {
			HOST: host,
			NITRO_HOST: host,
			NITRO_PORT: port,
			PORT: port,
		},
		origin,
	});
});

test.after(async () => {
	await stopServer(nitroServer);
});

test('Nitro page SSR renders nested context flow and hydrates child updates', browserTestOptions, async () => {
	const response = await fetch(origin);
	assert.equal(response.status, 200);

	const html = await response.text();
	assert.match(html, /<radiant-context-flow-shell>/);
	assert.match(html, /<radiant-context-flow-leaf>/);
	assert.match(html, /<radiant-slot-studio-board><section[^>]*class="component-card component-card--studio"/);
	assert.match(html, /Design systems is steering slot composition in build mode with 3 commits queued\./);
	assert.match(html, /<p[^>]*class="studio-insight__value">Build<\/p>/);
	assert.match(html, /<p[^>]*class="studio-insight__value">Calm<\/p>/);
	assert.match(html, /<p[^>]*class="studio-insight__value">3 synced<\/p>/);
	assert.doesNotMatch(html, /Awaiting board context/);
	assert.doesNotMatch(html, /class="studio-insight__value">Pending<\/p>/);
	assert.match(html, /Controller-owned render/);
	assert.match(html, /controller-decorator-visualizer__manual-ref-count">0</);
	assert.match(html, /Controller-owned context view/);
	assert.match(html, /controller-context-visualizer__consumer-count">2</);
	assert.match(html, /Context: Nitro SSR context \/ 2/);
	assert.match(html, /<script type="application\/json" id="app-state">.*<\/script>/);
	assert.match(html, /<script type="application\/json" id="radiant-document-state">.*<\/script>/);
	assert.match(html, /"customElementTagNames":\[[^\]]*"radiant-context-flow-shell"/);
	assert.match(html, /"controllerIdentifiers":\[[^\]]*"controller-context-visualizer"/);
	assert.doesNotMatch(html, /data-playground-state/);
	assert.match(
		html,
		/<script type="application\/json" data-hydration data-hydration-type="context" data-hydration-key="context">\{"label":"Nitro SSR context","level":2\}<\/script>/,
	);

	await withBrowserPage(async (page) => {
		await gotoPlayground(page);
		await waitForContextSummary(page, 'Context: Nitro SSR context / 2');

		const contextShell = page.locator('radiant-context-flow-shell').first();
		await contextShell.getByRole('button', { name: 'Increase context level' }).click();

		await waitForContextSummary(page, 'Context: Nitro SSR context / 3');
	});
});

test('Nitro page can opt into client-only app boot', browserTestOptions, async () => {
	const response = await fetch(`${origin}/?client-only=1`);
	assert.equal(response.status, 200);

	const html = await response.text();
	assert.doesNotMatch(html, /<radiant-context-flow-shell>/);
	assert.doesNotMatch(html, /data-playground-state/);
	assert.doesNotMatch(html, /radiant-counter/);

	await withBrowserPage(async (page) => {
		await gotoPlayground(page, '/?client-only=1');

		const clientStatePanel = getPanel(page, 'Client state');
		await waitForLocatorText(clientStatePanel.locator('strong'), '0');

		const liveCounter = page.locator('radiant-counter').first();
		await waitForLocatorText(liveCounter.locator('.component-metric'), 'Count: 2');
		await liveCounter.getByRole('button', { name: 'Increment', exact: true }).click();
		await waitForLocatorText(liveCounter.locator('.component-metric'), 'Count: 3');
	});
});

test('Nitro signal-board fragment serializes hydrated signal state', async () => {
	const response = await fetch(`${origin}/api/ssr/radiant-signal-release-board`);
	assert.equal(response.status, 200);

	const html = await response.text();
	assert.match(html, /<radiant-signal-release-board>/);
	assert.match(html, /Board: ready/);
	assert.match(html, /data-hydration data-hydration-type="signal" data-hydration-key="boardSeed">/);
	assert.match(html, /"filter":"launch-ready"/);
	assert.match(html, /"selectedTicketId":103/);
	assert.match(html, /"syncState":"ready"/);
	assert.match(html, /Nitro preloaded the release rehearsal with a launch-ready focus\./);
});

test('Nitro controller-decorator fragment serializes authored controller markup', async () => {
	const response = await fetch(`${origin}/api/ssr/radiant-controller-decorator-visualizer`);
	assert.equal(response.status, 200);

	const html = await response.text();
	assert.match(html, /<section class="controller-decorator-visualizer unstyled"/);
	assert.match(html, /data-controller="controller-dom-flow-visualizer"/);
	assert.match(html, /Controller-owned render/);
	assert.match(html, /controller-dom-flow-visualizer/);
	assert.match(html, /controller-decorator-visualizer__host-signal">ready</);
	assert.match(html, /controller-decorator-visualizer__manual-ref-count">0</);
	assert.match(html, /Ping render/);
});

test('Nitro controller-context fragment serializes provider and consumer surfaces', async () => {
	const response = await fetch(`${origin}/api/ssr/radiant-controller-context-visualizer`);
	assert.equal(response.status, 200);

	const html = await response.text();
	assert.match(html, /<section class="controller-context-visualizer unstyled"/);
	assert.match(html, /data-controller="controller-context-visualizer"/);
	assert.match(html, /Controller-owned context view/);
	assert.match(html, /controllerVisualizerContext/);
	assert.match(html, /controller-context-visualizer__consumer-count">2</);
	assert.match(html, /controller-context-visualizer__provider-count">2</);
});

test('Nitro page-level controls update client and route state after clicks', browserTestOptions, async () => {
	await withBrowserPage(async (page) => {
		await gotoPlayground(page);
		const clientStatePanel = getPanel(page, 'Client state');

		await waitForLocatorText(clientStatePanel.locator('strong'), '0');

		await clientStatePanel.getByRole('button', { name: 'Increment', exact: true }).click();
		await clientStatePanel.getByRole('button', { name: 'Increment', exact: true }).click();
		await waitForLocatorText(clientStatePanel.locator('strong'), '2');

		await waitForLocatorText(page.locator('[data-ref="nitro-status"]'), 'Status: idle');
		await waitForLocatorText(page.locator('[data-ref="nitro-message"]'), 'Nitro endpoint has not been called yet.');
		await waitForLocatorText(page.locator('[data-ref="nitro-server-time"]'), 'n/a');

		await page.locator('[data-ref="nitro-fetch-button"]').click();

		await waitForLocatorText(page.locator('[data-ref="nitro-status"]'), 'Status: ready');
		await waitForLocatorText(
			page.locator('[data-ref="nitro-message"]'),
			'Hello from Nitro via Vite + Nitro kitchen sink',
		);
		await waitForLocatorTextMatch(page.locator('[data-ref="nitro-server-time"]'), /^(?!n\/a).+/);
	});
});

test('Nitro kitchen sink counter card reacts to its own button clicks', browserTestOptions, async () => {
	await withBrowserPage(async (page) => {
		await gotoPlayground(page);

		const liveCounter = page.locator('radiant-counter').first();
		await waitForLocatorText(liveCounter.locator('.component-metric'), 'Count: 2');

		await liveCounter.getByRole('button', { name: 'Increment', exact: true }).click();
		await waitForLocatorText(liveCounter.locator('.component-metric'), 'Count: 3');

		await liveCounter.getByRole('button', { name: 'Decrement', exact: true }).click();
		await liveCounter.getByRole('button', { name: 'Decrement', exact: true }).click();
		await waitForLocatorText(liveCounter.locator('.component-metric'), 'Count: 1');
	});
});

test(
	'Nitro kitchen sink event lab demonstrates auto delegation and the native escape hatch',
	browserTestOptions,
	async () => {
		await withBrowserPage(async (page) => {
			await gotoPlayground(page);

			const eventLab = page.locator('radiant-event-binding-lab').first();
			await waitForLocatorText(eventLab.locator('[data-ref="event-auto-count"]'), 'Auto on:click count: 0');
			await waitForLocatorText(
				eventLab.locator('[data-ref="event-blocked-auto-count"]'),
				'Blocked on:click count: 0',
			);
			await waitForLocatorText(eventLab.locator('[data-ref="event-native-count"]'), 'on-native:click count: 0');

			await eventLab.locator('[data-ref="event-auto-button"] span').click();
			await waitForLocatorText(eventLab.locator('[data-ref="event-auto-count"]'), 'Auto on:click count: 1');
			await waitForLocatorText(
				eventLab.locator('[data-ref="event-auto-log"]'),
				'Last auto event: on:click currentTarget: button / target: span',
			);

			await eventLab.locator('[data-ref="event-blocked-auto-button"] span').click();
			await waitForLocatorText(
				eventLab.locator('[data-ref="event-blocked-auto-count"]'),
				'Blocked on:click count: 0',
			);
			await waitForLocatorText(
				eventLab.locator('[data-ref="event-blocked-note"]'),
				'Wrapper stopped bubbling before the root listener.',
			);

			await eventLab.locator('[data-ref="event-native-button"] span').click();
			await waitForLocatorText(eventLab.locator('[data-ref="event-native-count"]'), 'on-native:click count: 1');
			await waitForLocatorText(
				eventLab.locator('[data-ref="event-native-log"]'),
				'Last native event: on-native:click currentTarget: button / target: span',
			);
		});
	},
);

test('Nitro kitchen sink studio board composes slots and propagates context updates', browserTestOptions, async () => {
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
			'@querySlot sees 2 body regions, sidebar ready, footer ready. Projected custom element: radiant-counter.',
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

		const projectedCounter = studioBoard.locator('radiant-counter').first();
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

test('Nitro kitchen sink signal board handles filtered selection edge cases', browserTestOptions, async () => {
	await withBrowserPage(async (page) => {
		await gotoPlayground(page);

		const signalBoard = page.locator('radiant-signal-release-board').first();
		await waitForLocatorText(signalBoard.locator('h3'), 'Release command deck');
		await waitForLocatorText(
			signalBoard.locator('.signal-story__headline'),
			'Landing page orchestration is the current focus with 4 visible tickets in the rehearsal queue.',
		);
		await waitForLocatorText(signalBoard.locator('.signal-story__chip').nth(1), 'Visible: 4');
		await waitForLocatorText(signalBoard.locator('.signal-story__chip').nth(2), 'Blocked: 1');
		await waitForLocatorText(signalBoard.locator('.component-status').first(), 'Board: ready');

		await signalBoard.getByRole('button', { name: 'Cycle filter' }).click();
		await waitForLocatorText(signalBoard.locator('.signal-story__chip').nth(0), 'Filter: Blocked only');
		await waitForLocatorText(signalBoard.locator('.signal-story__chip').nth(1), 'Visible: 1');
		await waitForLocatorText(signalBoard.locator('.signal-story__focus-panel h4'), 'Nitro edge cache checklist');

		await signalBoard.getByRole('button', { name: 'Clear blocker' }).click();
		await waitForLocatorText(
			signalBoard.locator('.signal-story__headline'),
			'No tickets match the current filter. Cycle the view to restore the full release board.',
		);
		await waitForLocatorText(signalBoard.locator('.signal-story__focus-panel h4'), 'No ticket selected');
		await waitForLocatorText(signalBoard.locator('.signal-story__chip').nth(1), 'Visible: 0');
		await waitForLocatorText(signalBoard.locator('.signal-story__chip').nth(2), 'Blocked: 0');
		await waitForLocatorText(signalBoard.locator('.component-status').first(), 'Board: ready');

		await signalBoard.getByRole('button', { name: 'Cycle filter' }).click();
		await waitForLocatorText(signalBoard.locator('.signal-story__chip').nth(0), 'Filter: Launch-ready');
		await waitForLocatorText(signalBoard.locator('.signal-story__chip').nth(1), 'Visible: 1');
		await waitForLocatorText(signalBoard.locator('.signal-story__focus-panel h4'), 'Docs release summary');

		await signalBoard.getByRole('button', { name: 'Sync with Nitro brief' }).click();
		await waitForLocatorText(signalBoard.locator('.component-status').nth(1), 'Sync: ready');
		await waitForLocatorTextMatch(
			signalBoard.locator('.component-meta').nth(0),
			/Hello from Nitro via Vite \+ Nitro kitchen sink/,
		);
	});
});

test(
	'Nitro kitchen sink controller visualizers hydrate controller-owned authored DOM',
	browserTestOptions,
	async () => {
		await withBrowserPage(async (page) => {
			await gotoPlayground(page);

			const decoratorVisualizer = page.locator('[data-controller="controller-dom-flow-visualizer"]').first();
			await waitForLocatorText(
				decoratorVisualizer.locator('.controller-decorator-visualizer__host-signal'),
				'ready',
			);
			await waitForLocatorText(
				decoratorVisualizer.locator('.controller-decorator-visualizer__manual-ref-count'),
				'0',
			);
			await decoratorVisualizer.getByRole('button', { name: 'Alert' }).click();
			await waitForLocatorText(
				decoratorVisualizer.locator('.controller-decorator-visualizer__host-signal'),
				'alert',
			);
			await waitForLocatorText(
				decoratorVisualizer.locator('.controller-decorator-visualizer__host-busy'),
				'true',
			);
			await waitForLocatorText(
				decoratorVisualizer.locator('.controller-decorator-visualizer__state-pulses'),
				'1',
			);
			await waitForLocatorText(
				decoratorVisualizer.locator('.controller-decorator-visualizer__state-last-action'),
				'Host attribute changed to data-signal="alert"',
			);

			const contextVisualizer = page.locator('[data-controller="controller-context-visualizer"]').first();
			await waitForLocatorText(contextVisualizer.locator('.controller-context-visualizer__provider-count'), '2');
			await waitForLocatorText(contextVisualizer.locator('.controller-context-visualizer__consumer-count'), '2');
			await waitForLocatorText(contextVisualizer.locator('.controller-context-visualizer__selector-count'), '2');
			await contextVisualizer.getByRole('button', { name: '+1' }).click();
			await waitForLocatorText(contextVisualizer.locator('.controller-context-visualizer__provider-count'), '3');
			await waitForLocatorText(contextVisualizer.locator('.controller-context-visualizer__consumer-count'), '3');
			await waitForLocatorText(contextVisualizer.locator('.controller-context-visualizer__consumer-mode'), 'odd');
			await waitForLocatorText(contextVisualizer.locator('.controller-context-visualizer__selector-count'), '3');
		});
	},
);

test(
	'Nitro SSR fragment controls swap rendered components and hydrate fetched markup',
	browserTestOptions,
	async () => {
		await withBrowserPage(async (page) => {
			await gotoPlayground(page);

			const ssrPanel = getPanel(page, 'SSR route');
			assert.equal(await page.locator('radiant-server-card').count(), 0);
			assert.equal(await page.evaluate(() => customElements.get('radiant-server-card') === undefined), true);
			await waitForLocatorText(ssrPanel.locator('[data-ref="ssr-status"]'), 'Status: ready');
			await waitForLocatorAttribute(
				ssrPanel.locator('[data-ref="ssr-preview"]'),
				'data-tag-name',
				'radiant-counter',
			);
			await waitForLocatorText(
				ssrPanel.locator('[data-generated-at]'),
				await nonPlaceholderGeneratedAt(ssrPanel),
			);
			await waitForLocatorTextMatch(ssrPanel.locator('[data-ref="ssr-html"]'), /SSR counter rendered in Nitro/);

			const previewCounter = ssrPanel.locator('[data-ref="ssr-preview"] radiant-counter');
			await waitForLocatorText(previewCounter.locator('.component-metric').first(), 'Count: 6');

			await ssrPanel.getByRole('button', { name: 'Fetch server-card fragment' }).click();
			await waitForLocatorText(ssrPanel.locator('[data-ref="ssr-status"]'), 'Status: ready');
			await waitForLocatorAttribute(
				ssrPanel.locator('[data-ref="ssr-preview"]'),
				'data-tag-name',
				'radiant-server-card',
			);
			await waitForLocatorTextMatch(ssrPanel.locator('[data-ref="ssr-html"]'), /radiant-server-card/);

			const previewServerCard = ssrPanel.locator('[data-ref="ssr-preview"] radiant-server-card');
			assert.equal(await page.evaluate(() => customElements.get('radiant-server-card') !== undefined), true);
			await waitForLocatorText(previewServerCard.locator('.component-status'), 'Status: idle');
			await previewServerCard.getByRole('button', { name: 'Fetch from Nitro' }).click();
			await waitForLocatorText(previewServerCard.locator('.component-status'), 'Status: ready');
			await waitForLocatorText(
				previewServerCard.locator('.component-copy').nth(1),
				'Hello from Nitro via Vite + Nitro kitchen sink',
			);
			await waitForLocatorTextMatch(previewServerCard.locator('.component-meta'), /^Server time: (?!n\/a).+/);

			await ssrPanel.getByRole('button', { name: 'Fetch signal-board fragment' }).click();
			await waitForLocatorText(ssrPanel.locator('[data-ref="ssr-status"]'), 'Status: ready');
			await waitForLocatorAttribute(
				ssrPanel.locator('[data-ref="ssr-preview"]'),
				'data-tag-name',
				'radiant-signal-release-board',
			);
			await waitForLocatorTextMatch(ssrPanel.locator('[data-ref="ssr-html"]'), /radiant-signal-release-board/);

			const previewSignalBoard = ssrPanel.locator('[data-ref="ssr-preview"] radiant-signal-release-board');
			await waitForLocatorText(previewSignalBoard.locator('.component-status').first(), 'Board: ready');
			await waitForLocatorText(
				previewSignalBoard.locator('.signal-story__headline'),
				'Docs release summary is the current focus with 1 visible tickets in the rehearsal queue.',
			);
			await waitForLocatorTextMatch(
				previewSignalBoard.locator('.component-meta').nth(0),
				/Nitro preloaded the release rehearsal with a launch-ready focus\./,
			);

			await previewSignalBoard.getByRole('button', { name: 'Advance selected' }).click();
			await waitForLocatorText(
				previewSignalBoard.locator('.signal-story__headline'),
				'No tickets match the current filter. Cycle the view to restore the full release board.',
			);

			await ssrPanel.getByRole('button', { name: 'Fetch asset-backed fragment' }).click();
			await waitForLocatorAttribute(
				ssrPanel.locator('[data-ref="ssr-preview"]'),
				'data-tag-name',
				'radiant-counter',
			);
			await waitForLocatorTextMatch(ssrPanel.locator('[data-ref="ssr-html"]'), /Asset-backed SSR counter/);
			await waitForLocatorTextMatch(
				ssrPanel.locator('[data-ref="ssr-assets"] li').nth(0),
				/^script-module:hydrate /,
			);
			const assetBackedStyleHref = await poll(
				async () => {
					const value = normalizeText(
						await ssrPanel.locator('[data-ref="ssr-assets"] li').nth(1).textContent(),
					);
					return value.startsWith('style:') ? value.slice('style:'.length) : '';
				},
				{
					description: 'asset-backed fragment style asset href',
					isDone: (value) => /^\/assets\/.+\.css(?:\?.*)?$/.test(value),
					timeout: 5_000,
				},
			);
			await poll(
				async () =>
					page.evaluate(
						(expectedHref) =>
							document.head
								.querySelector(`link[rel="stylesheet"][href="${expectedHref}"]`)
								?.getAttribute('href') ?? '',
						assetBackedStyleHref,
					),
				{
					description: 'asset-backed fragment stylesheet link',
					isDone: (value) => value === assetBackedStyleHref,
					timeout: 5_000,
				},
			);

			const previewAssetCounter = ssrPanel.locator('[data-ref="ssr-preview"] radiant-counter');
			await waitForLocatorAttribute(previewAssetCounter, 'data-fragment-variant', 'asset-demo');
			await waitForLocatorText(previewAssetCounter.locator('.component-metric').first(), 'Count: 11');

			await ssrPanel.getByRole('button', { name: 'Fetch counter fragment' }).click();
			await waitForLocatorAttribute(
				ssrPanel.locator('[data-ref="ssr-preview"]'),
				'data-tag-name',
				'radiant-counter',
			);
			await waitForLocatorTextMatch(ssrPanel.locator('[data-ref="ssr-html"]'), /SSR counter rendered in Nitro/);
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

async function gotoPlayground(page, path = '/') {
	await page.goto(`${origin}${path}`, { waitUntil: 'load' });
	await page.waitForSelector('main.shell');
	await page.waitForSelector('radiant-context-flow-shell');
}

async function nonPlaceholderGeneratedAt(ssrPanel) {
	return poll(async () => normalizeText(await ssrPanel.locator('[data-generated-at]').textContent()), {
		description: 'non-placeholder generated timestamp',
		isDone: (value) => /^Generated at: (?!n\/a).+/.test(value),
		timeout: 5_000,
	});
}
