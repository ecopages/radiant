import type { JsxRenderable } from '@ecopages/jsx';

const RADIANT_VIEW_ELEMENT = Symbol.for('@ecopages/storybook-radiant.viewElement');
const RADIANT_SCRIPT_MODULE = Symbol.for('@ecopages/storybook-radiant.scriptModule');
const RADIANT_SCRIPT_EXPORT = Symbol.for('@ecopages/storybook-radiant.scriptExport');
const RADIANT_VIEW_MODULE = Symbol.for('@ecopages/storybook-radiant.viewModule');

export type RadiantViewStylesheets = readonly string[];

export type RadiantViewOptions = {
	/**
	 * Stylesheet paths relative to the view module (e.g. `./alert.css`).
	 *
	 * @remarks
	 * Declared as path strings — not `import './x.css'` — so published view
	 * modules stay free of CSS side effects (Ecopages vendor prebundles cannot
	 * bundle CSS). The strings are source metadata: Storybook’s view-module
	 * stamp transform reintroduces `import './x.css'` when transforming the
	 * module. Apps load styles via `@ecopages/radiant-ui/styles.css` (or a
	 * theme). Use the `withStylesheets` decorator only for story-scoped extras.
	 */
	stylesheets?: RadiantViewStylesheets;
};

export type RadiantViewComponent<TArgs = unknown> = ((args: TArgs) => JsxRenderable) & {
	[RADIANT_VIEW_ELEMENT]?: CustomElementConstructor;
	[RADIANT_SCRIPT_MODULE]?: string;
	[RADIANT_SCRIPT_EXPORT]?: string;
	[RADIANT_VIEW_MODULE]?: string;
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
	_options?: RadiantViewOptions,
): RadiantViewComponent<TArgs> {
	const view = ((args: TArgs) => render(args)) as RadiantViewComponent<TArgs>;
	linkViewToElement(view, element);
	return view;
}

/**
 * Declare stylesheet paths and view module URL on a presentational export (no custom element).
 *
 * @remarks
 * `stylesheets` must appear as a source array literal so Storybook’s stamp
 * transform can inject CSS imports. `moduleUrl` (`import.meta.url`) stamps the
 * view-module symbol for relative path resolution.
 */
export function attachRadiantStylesheets<T extends object>(
	target: T,
	_stylesheets: RadiantViewStylesheets,
	moduleUrl: string,
): T {
	const view = target as T & RadiantViewComponent;
	view[RADIANT_VIEW_MODULE] = moduleUrl;
	return target;
}

/** Re-copy SSR metadata from the linked element (e.g. after HMR). */
export function syncRadiantViewMetadata(view: RadiantViewComponent): void {
	const element = view[RADIANT_VIEW_ELEMENT];
	if (element) {
		linkViewToElement(view, element);
	}
}
