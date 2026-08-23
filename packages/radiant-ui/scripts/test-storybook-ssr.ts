import { execFile } from 'node:child_process';
import { spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium } from 'playwright';
import {
	evaluateStoryResult,
	formatFailure,
	parseHarnessOptions,
	resolveStoryIds,
	SSR_RENDER_MODES,
	SSR_TEST_PORT,
	type StoryIndex,
} from './storybook-ssr-harness';

const execFileAsync = promisify(execFile);
const origin = `http://localhost:${SSR_TEST_PORT}`;
const { smoke } = parseHarnessOptions();

async function waitForStorybook(): Promise<void> {
	for (let attempt = 0; attempt < 60; attempt += 1) {
		try {
			const response = await fetch(`${origin}/index.json`);
			if (response.ok) {
				return;
			}
		} catch {
			/* retry */
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	throw new Error('Timed out waiting for Storybook.');
}

async function isStorybookListening(): Promise<boolean> {
	try {
		const response = await fetch(`${origin}/index.json`, { signal: AbortSignal.timeout(300) });
		return response.ok;
	} catch {
		return false;
	}
}

async function waitUntilStopped(timeoutMs: number): Promise<boolean> {
	const startedAt = Date.now();
	while (Date.now() - startedAt < timeoutMs) {
		if (!(await isStorybookListening())) {
			return true;
		}
		await new Promise((resolve) => setTimeout(resolve, 150));
	}
	return !(await isStorybookListening());
}

async function killListenersOnPort(port: number): Promise<void> {
	try {
		const { stdout } = await execFileAsync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t']);
		for (const pid of stdout.trim().split('\n').filter(Boolean)) {
			try {
				process.kill(Number(pid), 'SIGKILL');
			} catch {
				/* already gone */
			}
		}
	} catch {
		/* nothing listening */
	}
}

function killProcessGroup(pid: number, signal: NodeJS.Signals): void {
	try {
		process.kill(-pid, signal);
	} catch {
		try {
			process.kill(pid, signal);
		} catch {
			/* already gone */
		}
	}
}

/**
 * Stops the detached `pnpm exec storybook` tree and anything still bound to the harness port.
 *
 * @remarks
 * SIGTERM on the wrapper pid is not enough: Storybook is a grandchild and keeps listening
 * after the Node script exits. Wait for the port to drop, then SIGKILL the group and port.
 */
async function stopServer(pid: number | undefined): Promise<void> {
	if (pid) {
		killProcessGroup(pid, 'SIGTERM');
	}
	if (await waitUntilStopped(4000)) {
		return;
	}
	if (pid) {
		killProcessGroup(pid, 'SIGKILL');
	}
	await killListenersOnPort(SSR_TEST_PORT);
	await waitUntilStopped(2000);
}

const server = spawn(
	'pnpm',
	[
		'--filter',
		'@ecopages/storybook-radiant-vite',
		'exec',
		'storybook',
		'dev',
		'-p',
		String(SSR_TEST_PORT),
		'-c',
		'../radiant-ui/.storybook',
		'--ci',
	],
	{
		detached: true,
		stdio: 'inherit',
	},
);

process.once('SIGINT', () => {
	void stopServer(server.pid).finally(() => process.exit(130));
});
process.once('SIGTERM', () => {
	void stopServer(server.pid).finally(() => process.exit(143));
});

try {
	await waitForStorybook();
	const index = (await fetch(`${origin}/index.json`).then((response) => response.json())) as StoryIndex;
	const storyIds = resolveStoryIds(index, smoke);
	const browser = await chromium.launch({ headless: true });
	const failures: string[] = [];

	for (const mode of SSR_RENDER_MODES) {
		for (const id of storyIds) {
			const page = await browser.newPage();
			const pageErrors: string[] = [];
			page.on('pageerror', (error) => pageErrors.push(error.message));
			await page.goto(`${origin}/iframe.html?id=${id}&globals=radiantRenderMode:${mode}`, {
				waitUntil: 'networkidle',
			});
			const errorBanner = page.locator('.radiant-ssr-error');
			const banner =
				(await errorBanner.count()) > 0 ? ((await errorBanner.textContent()) ?? 'ssr error banner') : null;
			const mount = await page.locator('#storybook-root').innerHTML();
			const failure = evaluateStoryResult({
				banner,
				mount,
				pageErrors,
				storyId: id,
				smoke,
			});
			if (failure) {
				failures.push(formatFailure(mode, id, failure));
			}
			await page.close();
		}
	}

	await browser.close();
	if (failures.length > 0) {
		const scope = smoke ? 'Storybook SSR smoke failures' : 'Storybook SSR failures';
		throw new Error(`${scope}:\n${failures.join('\n')}`);
	}
} finally {
	await stopServer(server.pid);
}
