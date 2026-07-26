import type { JsxRenderable } from '@ecopages/jsx';

const RADIANT_VIEW_ELEMENT = Symbol.for('@ecopages/storybook-radiant.viewElement');
const RADIANT_SCRIPT_MODULE = Symbol.for('@ecopages/storybook-radiant.scriptModule');
const RADIANT_SCRIPT_EXPORT = Symbol.for('@ecopages/storybook-radiant.scriptExport');

export type RadiantViewComponent<TArgs = unknown> = ((args: TArgs) => JsxRenderable) & {
	[RADIANT_VIEW_ELEMENT]?: CustomElementConstructor;
	[RADIANT_SCRIPT_MODULE]?: string;
	[RADIANT_SCRIPT_EXPORT]?: string;
};

function linkViewToElement<TArgs>(
	view: RadiantViewComponent<TArgs>,
	element: CustomElementConstructor & {
		[RADIANT_SCRIPT_MODULE]?: string;
		[RADIANT_SCRIPT_EXPORT]?: string;
	},
): void {
	view[RADIANT_VIEW_ELEMENT] = element;

	const ssrModule = element[RADIANT_SCRIPT_MODULE];
	if (ssrModule) {
		view[RADIANT_SCRIPT_MODULE] = ssrModule;
		view[RADIANT_SCRIPT_EXPORT] = element[RADIANT_SCRIPT_EXPORT] ?? element.name;
	}
}

/** Link a JSX view export to its RadiantElement class (same symbols as the Storybook framework). */
export function defineRadiantView<TArgs>(
	element: CustomElementConstructor & {
		[RADIANT_SCRIPT_MODULE]?: string;
		[RADIANT_SCRIPT_EXPORT]?: string;
	},
	render: (args: TArgs) => JsxRenderable,
): RadiantViewComponent<TArgs> {
	const view = ((args: TArgs) => render(args)) as RadiantViewComponent<TArgs>;
	linkViewToElement(view, element);
	return view;
}

/** Re-copy SSR metadata from the linked element (e.g. after HMR). */
export function syncRadiantViewMetadata(view: RadiantViewComponent): void {
	const element = view[RADIANT_VIEW_ELEMENT];
	if (element) {
		linkViewToElement(view, element);
	}
}
