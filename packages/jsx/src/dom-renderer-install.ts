import { hydrate, pauseSubscriptions, render, resumeSubscriptions } from './dom-render.ts';
import { installDomRenderer } from './dom-renderer.ts';

let installed = false;

/**
 * Publishes this package's DOM renderer once. Runs when `@ecopages/jsx/jsx-runtime` loads and on the first
 * `jsx()` / `jsxs()` call, so every JSX view, written as syntax or by hand, finds the renderer before it mounts.
 */
export function ensureDomRendererInstalled(): void {
	if (installed) return;
	installed = true;
	installDomRenderer({ render, hydrate, pauseSubscriptions, resumeSubscriptions });
}
