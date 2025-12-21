export type WithChildren<T = unknown> = T & { children?: JSX.Element | JSX.Element[] };

export type WithChildrenAndClassName<T = unknown> = WithChildren<T> & { className?: string };

export type FocusableElement =
	| HTMLAnchorElement
	| HTMLButtonElement
	| HTMLInputElement
	| HTMLTextAreaElement
	| HTMLSelectElement
	| (HTMLElement & { tabindex: number });
