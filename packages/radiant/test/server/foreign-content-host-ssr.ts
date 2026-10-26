import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type { BrowserCommand } from 'vitest/node';

/**
 * One server render: `html` is what the page sends, and `text` the text of its `tag` element, a raw-text tag. `foreign`
 * is false for a host in HTML context, including under an SVG `title` or `desc`, whose `style` stays raw CSS.
 */
export type ForeignContentHostRender = { name: string; html: string; tag: string; text: string; foreign: boolean };

/**
 * Vitest browser command: returns the renders of `foreign-content-host-ssr.render.ts`.
 *
 * @remarks That script runs in its own Node process: the SSR runtime installs minimal-DOM globals that must not
 * leak into the Vitest process, and importing it here would pull the sources into the config bundle.
 */
export const renderForeignContentHostsCommand: BrowserCommand<[]> = async () => {
	const script = fileURLToPath(new URL('./foreign-content-host-ssr.render.ts', import.meta.url));
	const { stdout } = await promisify(execFile)(process.execPath, ['--import', 'tsx', script], {
		cwd: fileURLToPath(new URL('../..', import.meta.url)),
		timeout: 60_000,
	});
	return JSON.parse(stdout) as ForeignContentHostRender[];
};

declare module 'vitest/browser' {
	interface BrowserCommands {
		renderForeignContentHosts: () => Promise<ForeignContentHostRender[]>;
	}
}
