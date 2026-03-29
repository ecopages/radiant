import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

export const browserTestOptions = { timeout: 15_000 };

export async function runCommand(command, args, cwd) {
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

export async function startServer({ command, args, cwd, env, origin }) {
	const server = spawn(command, args, {
		cwd,
		env: {
			...process.env,
			...env,
		},
		stdio: ['ignore', 'pipe', 'pipe'],
	});

	server.stdout?.on('data', () => undefined);
	server.stderr?.on('data', () => undefined);

	await waitForServer(origin);
	return server;
}

export async function stopServer(server) {
	if (!server || server.killed) {
		return;
	}

	server.kill('SIGTERM');
	await Promise.race([once(server, 'exit'), delay(5_000)]);

	if (!server.killed) {
		server.kill('SIGKILL');
	}
}

export async function withBrowserPage(run) {
	const browser = await chromium.launch({ headless: true });

	try {
		const page = await browser.newPage();
		attachPageDiagnostics(page);
		await run(page);
	} finally {
		await browser.close();
	}
}

export function attachPageDiagnostics(page) {
	page.on('console', (message) => {
		const type = message.type();
		if (type === 'warning' || type === 'error') {
			console.log(`browser:console:${type}:${message.text()}`);
		}
	});
	page.on('pageerror', (error) => {
		console.log(`browser:pageerror:${error.stack}`);
	});
	page.on('requestfailed', (request) => {
		console.log(`browser:requestfailed:${request.url()}:${request.failure()?.errorText}`);
	});
}

export async function waitForServer(url) {
	for (let attempt = 0; attempt < 80; attempt += 1) {
		try {
			const response = await fetch(url);

			if (response.ok) {
				return;
			}
		} catch {}

		await delay(250);
	}

	throw new Error(`Timed out waiting for server at ${url}`);
}

export async function poll(readValue, options) {
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

export function normalizeText(value) {
	return value?.replace(/\s+/g, ' ').trim() ?? '';
}

export async function waitForLocatorText(locator, expectedText, timeout = 5_000) {
	const actualText = await poll(async () => normalizeText(await locator.textContent()), {
		description: `text ${JSON.stringify(expectedText)}`,
		isDone: (value) => value === expectedText,
		timeout,
	});

	assert.equal(actualText, expectedText);
}

export async function waitForLocatorTextMatch(locator, expectedPattern, timeout = 5_000) {
	const actualText = await poll(async () => normalizeText(await locator.textContent()), {
		description: `text matching ${expectedPattern}`,
		isDone: (value) => expectedPattern.test(value),
		timeout,
	});

	assert.match(actualText, expectedPattern);
}

export async function waitForLocatorAttribute(locator, attributeName, expectedValue, timeout = 5_000) {
	const actualValue = await poll(async () => (await locator.getAttribute(attributeName)) ?? '', {
		description: `${attributeName} ${JSON.stringify(expectedValue)}`,
		isDone: (value) => value === expectedValue,
		timeout,
	});

	assert.equal(actualValue, expectedValue);
}

export function getPanel(page, headingName) {
	return page.locator('section.panel, section').filter({
		has: page.getByRole('heading', { name: headingName, exact: true }),
	});
}
