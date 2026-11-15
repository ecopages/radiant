import { expect } from 'vitest';
import { userEvent } from 'vitest/browser';
import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import '../../../styles/styles.css';
import '../../../styles/themes/default.css';
import { RuiDialog, RuiDialogActions, RuiDialogBody, RuiDialogClose } from './dialog';
import { RuiDialog as RuiDialogScript } from './dialog.script';
import { installDialogs, uninstallDialogs } from './dialog-registry';
void RuiDialogScript;

export const DIALOG_ID = 'composition-dialog';

export type DialogEl = HTMLElement & { open: boolean };

/** Lets the elements upgrade and the open/close transitions and floating positions settle. */
export async function settled(): Promise<void> {
	await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
	await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))));
}

export type Page = {
	host: HTMLElement;
	opener: HTMLButtonElement;
	dialog: DialogEl;
	surface: HTMLElement;
	cleanup: () => void;
};

/**
 * Mounts a page with an opener, a `rui-dialog` holding `children` and a trigger inside the dialog that opens a
 * nested dialog by the element API, then opens the dialog with a real click on the `data-dialog-open` opener.
 */
export async function mountOpenDialog(
	children: JsxRenderable,
	options: { scrollBody?: boolean; before?: JsxRenderable; enterDuration?: string } = {},
): Promise<Page> {
	installDialogs();
	const host = document.createElement('div');
	document.body.append(host);
	createRoot(host).render(
		<>
			<button type="button" id="opener" data-dialog-open={DIALOG_ID}>
				Open dialog
			</button>
			<button type="button" id="page-after">
				After
			</button>
			<div style="height: 3000px" data-page-filler />
			{options.before}
			<RuiDialog
				id={DIALOG_ID}
				label="Composition dialog"
				style={options.enterDuration ? `--dialog-enter-duration: ${options.enterDuration}` : undefined}
			>
				{options.scrollBody ? (
					<div id="scroll-body" style="max-height: 14rem; overflow-y: auto">
						{children}
					</div>
				) : (
					children
				)}
				<RuiDialogActions>
					<button type="button" data-dialog-close>
						Done
					</button>
				</RuiDialogActions>
			</RuiDialog>
		</>,
	);
	await settled();
	const opener = host.querySelector('#opener') as HTMLButtonElement;
	const dialog = host.querySelector(`#${DIALOG_ID}`) as DialogEl;
	await userEvent.click(opener);
	await settled();
	expect(dialog.open).toBe(true);
	return {
		host,
		opener,
		dialog,
		surface: dialog.querySelector('[data-ref="dialog"]') as HTMLElement,
		cleanup: () => {
			host.remove();
			uninstallDialogs();
			document.documentElement.removeAttribute('style');
			document.body.removeAttribute('style');
		},
	};
}

export function center(element: Element): { x: number; y: number } {
	const rect = element.getBoundingClientRect();
	return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/** The element a real pointer would hit at the center of `element`. */
export function hitAt(element: Element): Element | null {
	const { x, y } = center(element);
	return document.elementFromPoint(x, y);
}

/** Whether `element` is what the pointer reaches at its own center, so nothing stacks above it. */
export function isReachable(element: Element, within: Element = element): boolean {
	const hit = hitAt(element);
	return hit !== null && within.contains(hit);
}

export function describeHit(element: Element): string {
	const hit = hitAt(element);
	return hit ? `${hit.tagName.toLowerCase()}.${String(hit.className)}` : 'null';
}

export function isInDocumentOrder(first: Element, second: Element): boolean {
	return Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
}

type ObserverClass = typeof MutationObserver | typeof ResizeObserver | typeof IntersectionObserver;

/**
 * Records what a test leaves registered on `document`, `window` and the observer classes, and the timeouts still
 * pending, so a test can compare the state after teardown with the state before.
 */
export function trackSideEffects() {
	const listeners = new Set<string>();
	const entries = new Map<string, { target: EventTarget; type: string; listener: unknown; capture: boolean }>();
	const ids = new Map<unknown, number>();
	const idOf = (listener: unknown) => {
		if (!ids.has(listener)) ids.set(listener, ids.size);
		return ids.get(listener)!;
	};
	const restores: Array<() => void> = [];
	for (const target of [document, window] as EventTarget[]) {
		const add = target.addEventListener;
		const remove = target.removeEventListener;
		const name = target === window ? 'window' : 'document';
		const captureOf = (options?: boolean | EventListenerOptions) =>
			typeof options === 'boolean' ? options : Boolean(options?.capture);
		target.addEventListener = function (
			this: EventTarget,
			type: string,
			listener: EventListenerOrEventListenerObject,
			options?: boolean | AddEventListenerOptions,
		) {
			const key = `${name}:${type}:${idOf(listener)}:${captureOf(options)}`;
			listeners.add(key);
			entries.set(key, { target, type, listener, capture: captureOf(options) });
			return add.call(this, type, listener, options);
		} as typeof target.addEventListener;
		target.removeEventListener = function (
			this: EventTarget,
			type: string,
			listener: EventListenerOrEventListenerObject,
			options?: boolean | EventListenerOptions,
		) {
			const key = `${name}:${type}:${idOf(listener)}:${captureOf(options)}`;
			listeners.delete(key);
			entries.delete(key);
			return remove.call(this, type, listener, options);
		} as typeof target.removeEventListener;
		restores.push(() => {
			target.addEventListener = add;
			target.removeEventListener = remove;
		});
	}

	const observing = new Set<object>();
	for (const Class of [MutationObserver, ResizeObserver, IntersectionObserver] as ObserverClass[]) {
		const proto = Class.prototype as { observe: (...args: unknown[]) => void; disconnect: () => void };
		const observe = proto.observe;
		const disconnect = proto.disconnect;
		proto.observe = function (this: object, ...args: unknown[]) {
			observing.add(this);
			return observe.apply(this, args);
		};
		proto.disconnect = function (this: object) {
			observing.delete(this);
			return disconnect.call(this);
		};
		restores.push(() => {
			proto.observe = observe;
			proto.disconnect = disconnect;
		});
	}

	const pending = new Set<number>();
	const setTimeoutOriginal = window.setTimeout;
	const clearTimeoutOriginal = window.clearTimeout;
	window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
		const id: number = setTimeoutOriginal(
			typeof handler === 'function'
				? (...inner: unknown[]) => {
						pending.delete(id);
						return (handler as (...a: unknown[]) => void)(...inner);
					}
				: handler,
			timeout,
			...args,
		);
		pending.add(id);
		return id;
	}) as typeof window.setTimeout;
	window.clearTimeout = ((id?: number) => {
		if (id !== undefined) pending.delete(id);
		return clearTimeoutOriginal(id);
	}) as typeof window.clearTimeout;
	restores.push(() => {
		window.setTimeout = setTimeoutOriginal;
		window.clearTimeout = clearTimeoutOriginal;
	});

	return {
		listeners: () => [...listeners].map((key) => key.split(':').slice(0, 2).join(':')).sort(),
		observers: () => observing.size,
		timers: () => pending.size,
		restore: () => restores.forEach((restore) => restore()),
	};
}

export { RuiDialog, RuiDialogActions, RuiDialogBody, RuiDialogClose };
