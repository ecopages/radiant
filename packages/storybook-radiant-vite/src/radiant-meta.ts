import type { Args } from 'storybook/internal/types';
import { linkRadiantViewElement, type RadiantViewComponent } from './resolve-ssr';
import type { Meta, RadiantComponent } from './types';

/** Stylesheet path relative to the story module (e.g. `./alert.css`). */
export type RadiantMetaStylesheet = string;

export type RadiantMetaOptions = {
	/** Host custom element for SSR. Omit for presentational views. */
	element?: CustomElementConstructor;
	/**
	 * Component CSS paths relative to the story file.
	 *
	 * @remarks
	 * Source-only metadata for the Storybook stamp transform (side-effect
	 * `import './x.css'`). Not copied onto runtime `parameters` — apps load CSS
	 * via `@ecopages/radiant-ui/styles.css`. Use `withStylesheets` /
	 * `parameters.stylesheets` for story-scoped extras.
	 */
	stylesheets?: readonly RadiantMetaStylesheet[];
};

/**
 * Wire Radiant SSR metadata for a CSF `meta` object.
 *
 * @remarks
 * Storybook's CSF indexer requires `export default` to be a plain object literal
 * (`const meta = { ... }; export default meta`). Pass `element` and `stylesheets`
 * in the second argument — `stylesheets` stays in source for the Vite stamp
 * transform only.
 */
export function radiantMeta<TArgs extends Args = Args>(
	meta: Meta<TArgs> & { component?: RadiantComponent },
	options?: RadiantMetaOptions,
): Meta<TArgs> {
	const { element, stylesheets: _stylesheets } = options ?? {};

	if (element && typeof meta.component === 'function') {
		linkRadiantViewElement(meta.component as RadiantViewComponent, element);
	}

	return meta as Meta<TArgs>;
}
