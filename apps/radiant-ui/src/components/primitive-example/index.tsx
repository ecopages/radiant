import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';

export type PrimitiveExampleProps = {
	/** Names the example for the page script, which finds its elements under `[data-example="<name>"]`. */
	name: string;
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
	render: ({ name, children }) => (
		<div class="primitive-example unstyled" data-example={name}>
			{children}
		</div>
	),
});
