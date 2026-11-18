import type { JsxRenderable } from './types/index.ts';

/** The DOM renderer a host library such as Radiant calls to mount, hydrate and pause JSX views. */
export type DomRenderer = {
	render(element: JsxRenderable, target: HTMLElement): void;
	hydrate(element: JsxRenderable, target: HTMLElement): void;
	pauseSubscriptions(target: HTMLElement): void;
	resumeSubscriptions(target: HTMLElement): void;
};

const DOM_RENDERER = Symbol.for('@ecopages/jsx.dom-renderer');

type DomRendererScope = typeof globalThis & { [DOM_RENDERER]?: DomRenderer };

/**
 * Publishes the DOM renderer. `@ecopages/jsx/jsx-runtime` calls it on import, so any module compiled from JSX
 * installs it.
 *
 * @remarks
 * Kept on `globalThis` under a `Symbol.for` key so a host library reaches it without importing the renderer, and so
 * duplicate package copies share the first one installed.
 */
export function installDomRenderer(renderer: DomRenderer): void {
	(globalThis as DomRendererScope)[DOM_RENDERER] ??= renderer;
}

/** The installed DOM renderer, or `undefined` when no module compiled from JSX has loaded. */
export function getDomRenderer(): DomRenderer | undefined {
	return (globalThis as DomRendererScope)[DOM_RENDERER];
}
