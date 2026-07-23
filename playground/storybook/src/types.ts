import type { JsxRenderable } from '@ecopages/jsx';

export type WithChildren<T = unknown> = T & { children?: JsxRenderable };

export type WithChildrenAndClassName<T = unknown> = WithChildren<T> & { className?: string };

/** Optional light-DOM slot when composing into a parent custom element. */
export type RadiantSlotProps = {
	slot?: string;
};

export type FocusableElement =
	| HTMLAnchorElement
	| HTMLButtonElement
	| HTMLInputElement
	| HTMLTextAreaElement
	| HTMLSelectElement
	| (HTMLElement & { tabindex: number });
