import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	browserTestOptions,
	runCommand,
	startServer,
	stopServer,
	waitForLocatorText,
	waitForLocatorTextMatch,
	withBrowserPage,
} from '../../../playground/test-support/playwright-e2e.mjs';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const docsDirectory = resolve(testDirectory, '..');
const host = '127.0.0.1';
const port = '3310';
const origin = `http://${host}:${port}`;

let docsPreviewServer;

test.before(async () => {
	await runCommand('pnpm', ['run', 'build'], docsDirectory);
	docsPreviewServer = await startServer({
		command: 'python3',
		args: ['-m', 'http.server', port, '-d', 'dist/client', '--bind', host],
		cwd: docsDirectory,
		origin,
	});
});

test.after(async () => {
	await stopServer(docsPreviewServer);
});

test(
	'Docs todo example preserves SSR todos after upgrade and keeps context interactions live',
	browserTestOptions,
	async () => {
		await withBrowserPage(async (page) => {
			await page.goto(`${origin}/docs/examples/todo-app`, { waitUntil: 'load' });
			await page.waitForSelector('radiant-todo-app');

			const todoApp = page.locator('radiant-todo-app').first();

			await waitForLocatorText(todoApp.locator('[data-ref="count-incomplete"]'), '2');
			await waitForLocatorText(todoApp.locator('[data-ref="count-complete"]'), '1');
			await waitForLocatorTextMatch(todoApp.locator('[data-ref="list-complete"]'), /Create a todo app/);
			await waitForLocatorTextMatch(todoApp.locator('[data-ref="list-incomplete"]'), /Add a todo item/);
			await waitForLocatorTextMatch(todoApp.locator('[data-ref="list-incomplete"]'), /Complete a todo item/);

			const removeIconDetails = await todoApp
				.locator('.todo__item-remove path')
				.first()
				.evaluate((node) => ({
					constructorName: node.constructor.name,
					namespace: node.namespaceURI,
				}));

			assert.equal(removeIconDetails.namespace, 'http://www.w3.org/2000/svg');
			assert.equal(removeIconDetails.constructorName, 'SVGPathElement');

			await todoApp.locator('input[name="todo"]').fill('Verify docs hydration');
			await todoApp.getByRole('button', { name: 'Add' }).click();

			await waitForLocatorText(todoApp.locator('[data-ref="count-incomplete"]'), '3');
			await waitForLocatorTextMatch(todoApp.locator('[data-ref="list-incomplete"]'), /Verify docs hydration/);

			await todoApp.getByLabel('Verify docs hydration').check();

			await waitForLocatorText(todoApp.locator('[data-ref="count-incomplete"]'), '2');
			await waitForLocatorText(todoApp.locator('[data-ref="count-complete"]'), '2');
			await waitForLocatorTextMatch(todoApp.locator('[data-ref="list-complete"]'), /Verify docs hydration/);
		});
	},
);

test(
	'Docs controller context visualizer example keeps controller and element consumers in sync',
	browserTestOptions,
	async () => {
		await withBrowserPage(async (page) => {
			await page.goto(`${origin}/docs/examples/controller-context-visualizer`, { waitUntil: 'load' });

			const visualizer = page.locator('.controller-context-visualizer').first();
			const providerCount = visualizer.locator('[data-ref="provider-count"]');
			const providerEvents = visualizer.locator('[data-ref="provider-events"]');
			const providerLast = visualizer.locator('[data-ref="provider-last"]');
			const controllerCount = visualizer.locator('[data-ref="controller-count"]');
			const controllerMode = visualizer.locator('[data-ref="controller-mode"]');
			const controllerLast = visualizer.locator('[data-ref="controller-last"]');
			const elementPanel = visualizer.locator('.controller-context-visualizer__panel--element');
			const elementCount = elementPanel.locator('.controller-context-visualizer__value');
			const elementLast = elementPanel.locator('.controller-context-visualizer__detail');

			await waitForLocatorText(providerCount, '2');
			await waitForLocatorText(providerEvents, '1');
			await waitForLocatorText(providerLast, 'Initialized count at 2');
			await waitForLocatorText(controllerCount, '2');
			await waitForLocatorText(controllerMode, 'even');
			await waitForLocatorText(controllerLast, 'Initialized count at 2');
			await waitForLocatorText(elementCount, '2');
			await waitForLocatorText(elementLast, 'Initialized count at 2');

			await visualizer.getByRole('button', { name: '+1' }).click();

			await waitForLocatorText(providerCount, '3');
			await waitForLocatorText(providerEvents, '2');
			await waitForLocatorText(providerLast, 'Incremented to 3');
			await waitForLocatorText(controllerCount, '3');
			await waitForLocatorText(controllerMode, 'odd');
			await waitForLocatorText(controllerLast, 'Incremented to 3');
			await waitForLocatorText(elementCount, '3');
			await waitForLocatorText(elementLast, 'Incremented to 3');

			await visualizer.getByRole('button', { name: 'Reset' }).click();

			await waitForLocatorText(providerCount, '2');
			await waitForLocatorText(providerEvents, '3');
			await waitForLocatorText(providerLast, 'Reset to 2');
			await waitForLocatorText(controllerCount, '2');
			await waitForLocatorText(controllerMode, 'even');
			await waitForLocatorText(controllerLast, 'Reset to 2');
			await waitForLocatorText(elementCount, '2');
			await waitForLocatorText(elementLast, 'Reset to 2');
		});
	},
);

test('Docs controller decorator visualizer example keeps authored DOM wiring in sync', browserTestOptions, async () => {
	await withBrowserPage(async (page) => {
		await page.goto(`${origin}/docs/examples/controller-decorator-visualizer`, { waitUntil: 'load' });

		const visualizer = page.locator('.controller-decorator-visualizer').first();
		const hostSignal = visualizer.locator('[data-ref="host-signal"]');
		const hostBusy = visualizer.locator('[data-ref="host-busy"]');
		const eventAction = visualizer.locator('[data-ref="event-action"]');
		const queryCount = visualizer.locator('[data-ref="query-count"]');
		const stateSignal = visualizer.locator('[data-ref="state-signal"]');
		const statePulses = visualizer.locator('[data-ref="state-pulses"]');
		const stateLastAction = visualizer.locator('[data-ref="state-last-action"]');
		const flowTitle = visualizer.locator('[data-ref="flow-title"]');
		const radios = visualizer.locator('rui-radio-group input[type="radio"]');

		await waitForLocatorText(hostSignal, 'ready');
		await waitForLocatorText(hostBusy, 'false');
		await waitForLocatorText(eventAction, 'initial hydrate');
		await waitForLocatorText(stateSignal, 'ready');
		await waitForLocatorText(statePulses, '0');
		await waitForLocatorText(stateLastAction, 'Hydrated from host attribute');
		await waitForLocatorText(flowTitle, 'Initial hydrate');

		const initialQueryCount = Number((await queryCount.textContent())?.trim() ?? '0');
		assert.equal(Number.isNaN(initialQueryCount), false);
		assert.ok(initialQueryCount > 0);

		await visualizer.locator('label.rui-radio').filter({ hasText: 'Ready' }).click();
		await visualizer.locator('label.rui-radio').filter({ hasText: 'Focus' }).click();
		await waitForLocatorText(hostSignal, 'focus');
		assert.deepEqual(
			await radios.evaluateAll((inputs) => inputs.filter((input) => input.checked).map((input) => input.value)),
			['focus'],
		);
		assert.deepEqual(await radios.evaluateAll((inputs) => inputs.map((input) => input.name)), [
			'controller-signal',
			'controller-signal',
			'controller-signal',
		]);

		await visualizer.locator('label.rui-radio').filter({ hasText: 'Alert' }).click();

		await waitForLocatorText(hostSignal, 'alert');
		assert.deepEqual(
			await radios.evaluateAll((inputs) => inputs.filter((input) => input.checked).map((input) => input.value)),
			['alert'],
		);
		await waitForLocatorText(hostBusy, 'true');
		await waitForLocatorText(eventAction, 'change:alert');
		await waitForLocatorText(stateSignal, 'alert');
		await waitForLocatorText(statePulses, '2');
		await waitForLocatorText(stateLastAction, 'Host attribute changed to data-signal="alert"');
		await waitForLocatorText(flowTitle, 'Signal rerouted');

		await visualizer.getByRole('button', { name: 'Ping refs' }).click();

		await waitForLocatorText(eventAction, 'click:ping');
		await waitForLocatorText(statePulses, '3');
		await waitForLocatorText(flowTitle, 'Ref pulse');
	});
});

test('Docs code examples copy their source', browserTestOptions, async () => {
	await withBrowserPage(async (page) => {
		await page.goto(`${origin}/docs/getting-started/installation`, { waitUntil: 'load' });

		const copyButton = page.locator('[data-rehype-pretty-copy]').first();
		const source = await copyButton.getAttribute('data-rehype-pretty-copy');
		assert.ok(source);

		await page.evaluate(() => {
			Object.defineProperty(navigator, 'clipboard', {
				configurable: true,
				value: {
					writeText: (value) => {
						document.documentElement.dataset.docsCopiedCode = value;
						return Promise.resolve();
					},
				},
			});
		});
		await copyButton.click();

		await waitForLocatorText(copyButton, 'Copied');
		assert.equal(await page.locator('html').getAttribute('data-docs-copied-code'), source);
		assert.equal(await copyButton.getAttribute('aria-label'), 'Copy code');
		await waitForLocatorText(page.locator('[data-code-copy-status]'), 'Code copied to clipboard');
	});
});

async function statusOf(url) {
	const response = await fetch(url);
	await response.arrayBuffer();
	return response.status;
}

test('Docs redirects send every moved page to a built page', async () => {
	const rules = (await readFile(resolve(docsDirectory, 'dist/client/_redirects'), 'utf8')).trim().split('\n');
	assert.ok(rules.length > 0);

	for (const rule of rules) {
		const [from, to, status] = rule.split(' ');
		assert.equal(status, '301');
		assert.equal(await statusOf(`${origin}${to}`), 200, `${from} redirects to missing ${to}`);
		assert.equal(await statusOf(`${origin}${from}`), 404, `${from} is still served as a page`);
	}
});

test('Docs pages link Markdown exports and keep the legacy text exports', async () => {
	const html = await (await fetch(`${origin}/docs/signals/signals-overview`)).text();
	const alternate = html.match(/<link rel="alternate" type="text\/markdown" href="([^"]+)"/)?.[1];
	assert.ok(alternate, 'page advertises a Markdown alternate');
	assert.equal(new URL(alternate).pathname, '/docs-llm/signals/signals-overview.md');
	assert.match(html, /llm-url="\/docs-llm\/signals\/signals-overview\.md"/);

	const markdown = await fetch(`${origin}/docs-llm/signals/signals-overview.md`);
	assert.equal(markdown.status, 200);
	const body = await markdown.text();
	const legacy = await fetch(`${origin}/llms-content/packages/signals-overview.txt`);
	assert.equal(legacy.status, 200);
	assert.equal(await legacy.text(), body);

	const llmsTxt = await (await fetch(`${origin}/llms.txt`)).text();
	assert.match(llmsTxt, /\/docs-llm\/getting-started\/introduction\.md\)/);
	assert.doesNotMatch(llmsTxt, /\/llms-content\//);
});

test('Docs section index pages are served at the section URL', async () => {
	const html = await (await fetch(`${origin}/docs/decorators`)).text();
	assert.match(html, /<link rel="canonical" href="[^"]*\/docs\/decorators"/);
	assert.match(html, /id="typing-decorated-fields"/);
	assert.equal(await statusOf(`${origin}/docs/context`), 200);
	assert.equal(await statusOf(`${origin}/docs/decorators/index/`), 404);
});
