import type { JsxRenderable } from '@ecopages/jsx';
import { linkRadiantViewElement, type RadiantViewComponent } from './resolve-ssr';
import { RADIANT_VIEW_ELEMENT } from './symbols';

/**
 * Link a JSX view to its RadiantElement class so Storybook can infer SSR module paths.
 *
 * Prefer this on component view exports; stories only need `component: MyView`.
 */
export function defineRadiantComponent<TArgs>(
	element: CustomElementConstructor,
	render: (args: TArgs) => JsxRenderable | Node | string | null | undefined,
): RadiantViewComponent<TArgs> {
	const view = ((args: TArgs) => render(args)) as RadiantViewComponent<TArgs>;
	linkRadiantViewElement(view as RadiantViewComponent, element);
	return view;
}

export { RADIANT_VIEW_ELEMENT };
