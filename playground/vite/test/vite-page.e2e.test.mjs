import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
	browserTestOptions,
	runCommand,
	startServer,
	stopServer,
	waitForLocatorText,
	waitForLocatorTextMatch,
	withBrowserPage,
} from '../../test-support/playwright-e2e.mjs';

const testDirectory = dirname(fileURLToPath(import.meta.url));
const playgroundDirectory = resolve(testDirectory, '..');
const host = '127.0.0.1';
const port = '3210';
const origin = `http://${host}:${port}`;

let vitePreviewServer;

test.before(async () => {
	await runCommand('bun', ['run', 'build'], playgroundDirectory);
	vitePreviewServer = await startServer({
		command: 'bunx',
		args: ['vite', 'preview', '--host', host, '--port', port, '--strictPort'],
		cwd: playgroundDirectory,
		origin,
	});
});

test.after(async () => {
	await stopServer(vitePreviewServer);
});

test('Vite playground counter and refs demos update after user actions', browserTestOptions, async () => {
	await withBrowserPage(async (page) => {
		await gotoPlayground(page);

		const counter = page.locator('radiant-counter').first();
		await waitForLocatorText(counter.locator('[data-ref="count"]'), '5');
		await waitForLocatorText(counter.locator('[data-ref="status"]'), 'Waiting for input');

		await counter.getByRole('button', { name: 'Increment' }).click();
		await waitForLocatorText(counter.locator('[data-ref="count"]'), '6');
		await waitForLocatorText(counter.locator('[data-ref="status"]'), 'Incremented');

		await counter.getByRole('button', { name: 'Decrement' }).click();
		await waitForLocatorText(counter.locator('[data-ref="count"]'), '5');
		await waitForLocatorText(counter.locator('[data-ref="status"]'), 'Decremented');

		const refs = page.locator('radiant-refs').first();
		await waitForLocatorText(refs.locator('[data-ref="count"]'), '1');
		await refs.getByRole('button', { name: 'Add Ref' }).click();
		await refs.getByRole('button', { name: 'Add Ref' }).click();
		await waitForLocatorText(refs.locator('[data-ref="count"]'), '3');

		await refs.locator('[data-ref="item"]').nth(1).click();
		await waitForLocatorText(refs.locator('[data-ref="count"]'), '2');

		await refs.getByRole('button', { name: 'Reset Refs' }).click();
		await waitForLocatorText(refs.locator('[data-ref="count"]'), '0');
		await waitForLocatorText(refs.locator('[data-ref="container"]'), 'No Refs');
	});
});

test('Vite playground todo flow supports add, complete, and remove', browserTestOptions, async () => {
	await withBrowserPage(async (page) => {
		await gotoPlayground(page);

		const todoApp = page.locator('radiant-todo-app').first();
		await waitForLocatorText(todoApp.locator('[data-ref="count-incomplete"]'), '2');
		await waitForLocatorText(todoApp.locator('[data-ref="count-complete"]'), '1');

		await todoApp.locator('input[name="todo"]').fill('Ship Playwright coverage');
		await todoApp.getByRole('button', { name: 'Add' }).click();

		await waitForLocatorText(todoApp.locator('[data-ref="count-incomplete"]'), '3');
		await waitForLocatorTextMatch(todoApp.locator('[data-ref="list-incomplete"]'), /Ship Playwright coverage/);

		await todoApp.getByLabel('Ship Playwright coverage').check();
		await waitForLocatorText(todoApp.locator('[data-ref="count-incomplete"]'), '2');
		await waitForLocatorText(todoApp.locator('[data-ref="count-complete"]'), '2');

		await todoApp.locator('[data-ref="list-complete"] [data-ref="remove-todo"]').first().click();
		await waitForLocatorText(todoApp.locator('[data-ref="count-complete"]'), '1');
	});
});

test('Vite playground event and value demos react in the browser', browserTestOptions, async () => {
	await withBrowserPage(async (page) => {
		await gotoPlayground(page);

		const eventListener = page.locator('radiant-event-listener').first();
		await waitForLocatorText(eventListener.locator('[data-ref="event-detail"]'), 'No Event');
		await eventListener.getByRole('button', { name: 'Emit Event' }).click();
		await waitForLocatorTextMatch(eventListener.locator('[data-ref="event-detail"]'), /^Hello World /);

		const keyboardKeys = page.locator('radiant-keyboard-keys').first();
		await page.keyboard.press('K');
		await waitForLocatorText(keyboardKeys.locator('span'), 'K');

		const valueTester = page.locator('radiant-tester').first();
		await valueTester.getByRole('button', { name: 'Increment Number' }).click();
		await waitForLocatorText(valueTester.locator('[data-ref="number"]'), '2');
		await valueTester.getByRole('button', { name: 'Toggle Boolean' }).click();
		await waitForLocatorText(valueTester.locator('[data-ref="boolean"]'), 'true');
		await valueTester.getByRole('button', { name: 'Update Array' }).click();
		await waitForLocatorTextMatch(valueTester.locator('[data-ref="array"]'), /\[/);
	});
});

test('Vite playground dropdown and accordion remain interactive', browserTestOptions, async () => {
	await withBrowserPage(async (page) => {
		await gotoPlayground(page);

		const accordion = page.locator('radiant-accordion').first();
		await accordion.getByText('Accordion 1').click();
		await waitForLocatorText(accordion.locator('details').first().locator('[data-ref="panel"]'), 'Content 1');

		const dropdown = page.locator('radiant-dropdown').first();
		await dropdown.getByRole('button', { name: 'Open' }).click();
		await waitForLocatorTextMatch(dropdown.locator('[data-ref="content"]'), /Option 1\s*Option 2\s*Option 3/);

		await page.locator('#placement').selectOption('bottom-end');
		await page.waitForFunction(
			() => document.querySelector('radiant-dropdown')?.getAttribute('placement') === 'bottom-end',
		);
		assert.equal(await page.locator('radiant-dropdown').getAttribute('placement'), 'bottom-end');
	});
});

async function gotoPlayground(page) {
	await page.goto(origin, { waitUntil: 'load' });
	await page.waitForSelector('main');
	await page.waitForFunction(
		() =>
			document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() === 'Radiant Components Playground',
	);
}
