import assert from 'node:assert/strict';
import test from 'node:test';
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
	await runCommand('bun', ['run', 'build'], docsDirectory);
	docsPreviewServer = await startServer({
		command: 'python3',
		args: ['-m', 'http.server', port, '-d', 'dist', '--bind', host],
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
			await page.goto(`${origin}/docs/examples/todo-app.html`, { waitUntil: 'load' });
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
