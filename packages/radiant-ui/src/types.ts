import type { JsxHtmlProps, JsxRenderable } from '@ecopages/jsx';

export type WithChildren<T = unknown> = T & { children?: JsxRenderable };

export type WithChildrenAndClassName<T = unknown> = WithChildren<T> & { className?: string };

/** Optional light-DOM slot when composing into a parent custom element. */
export type RadiantSlotProps = {
	slot?: string;
};

/**
 * Shared host props for radiant-ui views that forward onto a DOM host.
 *
 * @remarks
 * Built from `JsxHtmlProps` plus `slot` so views do not redeclare
 * `class` / `classes` / `data` / `aria` / `style` per component.
 */
export type RadiantHostProps = RadiantSlotProps & Pick<JsxHtmlProps, 'class' | 'classes' | 'data' | 'aria' | 'style'>;

export type FocusableElement =
	| HTMLAnchorElement
	| HTMLButtonElement
	| HTMLInputElement
	| HTMLTextAreaElement
	| HTMLSelectElement
	| (HTMLElement & { tabindex: number });
