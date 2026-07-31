import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const port = 6012;
const origin = `http://localhost:${port}`;
const modes = ['client', 'ssr-static', 'ssr-hydrate'] as const;

type StoryIndex = {
	entries: Record<string, { title: string; type: string }>;
};

async function waitForStorybook(): Promise<void> {
	for (let attempt = 0; attempt < 60; attempt += 1) {
		try {
			const response = await fetch(`${origin}/index.json`);
			if (response.ok) {
				return;
			}
		} catch {}
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	throw new Error('Timed out waiting for Storybook.');
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
		String(port),
		'-c',
		'../radiant-ui/.storybook',
		'--ci',
	],
	{
		stdio: 'inherit',
	},
);

try {
	await waitForStorybook();
	const index = (await fetch(`${origin}/index.json`).then((response) => response.json())) as StoryIndex;
	const storyIds = Object.entries(index.entries)
		.filter(([, entry]) => entry.type === 'story' && entry.title.startsWith('Components/'))
		.map(([id]) => id);
	const browser = await chromium.launch({ headless: true });
	const failures: string[] = [];

	for (const mode of modes) {
		for (const id of storyIds) {
			const page = await browser.newPage();
			const pageErrors: string[] = [];
			page.on('pageerror', (error) => pageErrors.push(error.message));
			await page.goto(`${origin}/iframe.html?id=${id}&globals=radiantRenderMode:${mode}`, {
				waitUntil: 'networkidle',
			});
			const banner = await page.locator('.radiant-ssr-error').textContent();
			const mount = await page.locator('#storybook-root').innerHTML();
			if (banner || !mount.trim() || pageErrors.length > 0) {
				const reason = banner || pageErrors.join('; ') || 'empty mount';
				failures.push(`${mode} ${id}: ${reason}`);
			}
			await page.close();
		}
	}

	await browser.close();
	if (failures.length > 0) {
		throw new Error(`Storybook SSR failures:\n${failures.join('\n')}`);
	}
} finally {
	server.kill();
}
