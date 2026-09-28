import type { JsxRoot } from '@ecopages/jsx';
import { ROOT_INNER_ID, SSR_MOUNT_ID } from './constants';

const mountedRoots = new WeakMap<HTMLElement, JsxRoot>();

/** Tear down any JSX root and clear the canvas. */
export function teardownCanvas(canvasElement: HTMLElement): void {
	mountedRoots.get(canvasElement)?.unmount();
	mountedRoots.delete(canvasElement);
	canvasElement.innerHTML = '';
}

export function getMountedRoot(canvasElement: HTMLElement): JsxRoot | undefined {
	return mountedRoots.get(canvasElement);
}

export function setMountedRoot(canvasElement: HTMLElement, root: JsxRoot): void {
	mountedRoots.set(canvasElement, root);
}

/** Ensure a stable `#root-inner` mount point for JSX (Lit/web-components pattern). */
export function ensureRootInner(canvasElement: HTMLElement, forceRemount: boolean): HTMLElement {
	let renderTo = canvasElement.querySelector<HTMLElement>(`#${ROOT_INNER_ID}`);
	if (forceRemount || !renderTo) {
		teardownCanvas(canvasElement);
		canvasElement.innerHTML = `<div id="${ROOT_INNER_ID}"></div>`;
		renderTo = canvasElement.querySelector<HTMLElement>(`#${ROOT_INNER_ID}`)!;
	}
	return renderTo;
}

/** Stable mount point for SSR hydrate markup (mirrors client `#root-inner`). */
export function ensureSsrMountRoot(canvasElement: HTMLElement): HTMLElement {
	teardownCanvas(canvasElement);
	canvasElement.innerHTML = `<div id="${SSR_MOUNT_ID}" class="radiant-ssr-mount"></div>`;
	return canvasElement.querySelector<HTMLElement>(`#${SSR_MOUNT_ID}`)!;
}
