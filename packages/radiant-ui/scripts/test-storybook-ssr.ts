import { spawn } from 'node:child_process';
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

function stopServer(pid: number | undefined): void {
	if (!pid) {
		return;
	}

	try {
		process.kill(-pid, 'SIGTERM');
	} catch {
		try {
			process.kill(pid, 'SIGTERM');
		} catch {
			/* already exited */
		}
	}
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
	stopServer(server.pid);
}
