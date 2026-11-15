import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';

export type PrimitiveExampleProps = {
	/** Names the example for the page script, which finds its elements under `[data-example="<name>"]`. */
	name?: string;
	/**
	 * Marks the frame as holding one custom element, a Radiant form that runs itself on connect, so it needs no
	 * `name` and no mount. The element takes no box of its own: its children lay out in the frame.
	 */
	host?: boolean;
	/** `stack` lays the children out as one full-width column instead of a wrapping row. */
	layout?: 'stack';
	children?: JsxRenderable;
};

/**
 * Frame for the smallest runnable example on a controller or helper page.
 *
 * @remarks
 * Only plain elements go inside. The frame styles them from the theme variables, so the example follows the
 * active theme without per-page CSS.
 */
export const PrimitiveExample = eco.component<PrimitiveExampleProps, JsxRenderable>({
	dependencies: { stylesheets: ['./primitive-example.css'] },
	render: ({ name, host, layout, children }) => (
		<div
			class="primitive-example unstyled"
			data-example={name}
			data-layout={layout}
			data-host={host ? '' : undefined}
		>
			{children}
		</div>
	),
});
