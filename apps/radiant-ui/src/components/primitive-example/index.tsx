import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { frameAttributes, type FrameOptions } from './frame';

export type PrimitiveExampleProps = FrameOptions & {
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
	render: ({ children, ...options }) => <div {...frameAttributes(options)}>{children}</div>,
});
