export type FocusableElement =
	| HTMLAnchorElement
	| HTMLButtonElement
	| HTMLInputElement
	| HTMLTextAreaElement
	| HTMLSelectElement
	| (HTMLElement & { tabindex: number });
