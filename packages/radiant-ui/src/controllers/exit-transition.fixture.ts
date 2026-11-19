import { expect } from 'vitest';

const STYLE_ID = 'exit-transition-fixture';

/**
 * Gives `element` a 400ms exit: toggling `hidden` on it starts a discrete `display` transition, which is what keeps
 * a portaled popup mounted while a real popup plays its exit.
 *
 * @remarks The unit project loads no component CSS, so without this a popup closes synchronously and the exit
 * window these tests cover never opens.
 */
export function withSlowExit<T extends HTMLElement>(element: T): T {
	if (!document.getElementById(STYLE_ID)) {
		const style = document.createElement('style');
		style.id = STYLE_ID;
		style.textContent = `
			[data-slow-exit] { opacity: 1; transition: opacity 400ms, display 400ms allow-discrete; }
			[data-slow-exit][hidden] { opacity: 0; }
		`;
		document.head.append(style);
	}
	element.setAttribute('data-slow-exit', '');
	return element;
}

/**
 * Resolves once every animation running on `element` (and below it with `subtree`) has finished or been cancelled.
 *
 * @remarks Call it right after the action that starts the animation. The popover controller waits on the same
 * animations before it moves the node home and its continuation was registered first, so the node is back in place
 * when this resolves. A cancelled animation settles the wait rather than failing the test.
 */
export async function animationsFinished(element: Element, options?: GetAnimationsOptions): Promise<void> {
	await Promise.allSettled(element.getAnimations(options).map((animation) => animation.finished));
}

/** What `expectPopupFoundAcrossPortalCycle` drives and reads. */
export type PortalCycle = {
	/** The popup as first rendered, in its home position. */
	popup: HTMLElement;
	/** Whether opening moves the popup to `document.body`. */
	portaled: boolean;
	open: () => void | Promise<void>;
	close: () => void | Promise<void>;
	/** How the component under test reads its popup now. */
	find: () => HTMLElement | null;
};

/**
 * Opens and closes a component's popup twice and checks that `find()` returns the node that is current each time:
 * while open, during the exit, and after a close and reopen that swapped the node.
 *
 * @remarks The swap stands for a re-render that stamps a new popup while the old one is closed. A reference taken
 * once, such as a cached query, answers with the old node from then on. The clone is normalized: it would otherwise
 * copy the empty text nodes the JSX renderer leaves around its ranges, and a nested host upgrading in the clone reads
 * them as a view that rendered it before its tag was defined, which a real re-render never does.
 */
export async function expectPopupFoundAcrossPortalCycle(cycle: PortalCycle): Promise<void> {
	const { portaled, open, close, find } = cycle;
	const home = cycle.popup.parentElement;
	withSlowExit(cycle.popup);

	await open();
	expect(cycle.popup.parentElement).toBe(portaled ? document.body : home);
	expect(find()).toBe(cycle.popup);

	await close();
	expect(cycle.popup.hidden).toBe(true);
	expect(cycle.popup.parentElement).toBe(portaled ? document.body : home);
	expect(find()).toBe(cycle.popup);

	await animationsFinished(cycle.popup);
	expect(cycle.popup.parentElement).toBe(home);
	const clone = cycle.popup.cloneNode(true) as HTMLElement;
	clone.normalize();
	const next = withSlowExit(clone);
	cycle.popup.replaceWith(next);

	await open();
	expect(next.parentElement).toBe(portaled ? document.body : home);
	expect(find()).toBe(next);
	expect(find()).not.toBe(cycle.popup);
}
