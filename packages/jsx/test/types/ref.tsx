import type { JsxRefCallback } from '../../src/index.ts';

export const input = <input ref={(node: HTMLInputElement | null) => void node?.focus()} />;
export const inferred = <input ref={(node) => void node?.value} />;
export const withCleanup = <canvas ref={(node) => (node ? () => void node.width : undefined)} />;
export const customElement = <demo-panel ref={(node) => void node?.localName} />;

const sharedRef: JsxRefCallback<HTMLElement> = (node) => void node?.id;
export const widened = <input ref={sharedRef} />;

export const wrongElement = (
	// @ts-expect-error a canvas ref cannot take a callback that needs an input
	<canvas ref={(node: HTMLInputElement | null) => void node?.value} />
);
// @ts-expect-error ref takes a callback, not a value
export const notCallback = <input ref="field" />;
// @ts-expect-error a callback that returns a non-function value is not a cleanup
export const returnsNode = <input ref={(node) => node} />;
