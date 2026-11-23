import type { FrameOptions } from '../primitive-example/frame';

/**
 * How the example frame holds a recipe pattern: one root, whatever the pattern, inside a host frame. The element and
 * controller patterns' root is the host element, the plain pattern's is its own `<div data-example>`, and none is the
 * frame, so a recipe stylesheet that styles the root as a card sees the same box in each. The frame carries no
 * `data-example`, so a page script mounts the plain root once.
 *
 * @remarks
 * Kept free of Node imports, and used by the component that renders the examples and by the tests that build the
 * frame, so they cannot disagree about it.
 */
export function exampleFrameOptions(layout?: 'stack'): FrameOptions {
	return { host: true, layout };
}
