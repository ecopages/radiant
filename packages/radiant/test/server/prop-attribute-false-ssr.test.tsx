// @vitest-environment node
import '../../src/server/install-ssr-runtime';
import type { JSX_PROPS } from '@ecopages/jsx';
import { renderToString } from '@ecopages/jsx/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { prop } from '../../src/decorators/prop';
import { withRadiantServerCustomElementRenderBridge } from '../../src/server/radiant-element-ssr';

class Engine {
	constructor(public readonly secret = 'private') {}
	getRecipe() {
		return 'recipe';
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'ssr-property-only': SsrPropertyOnly;
		'ssr-serialized-engine': SsrSerializedEngine;
		'ssr-lossy-props': SsrLossyProps;
	}
}

@customElement('ssr-property-only')
class SsrPropertyOnly extends RadiantElement {
	declare readonly [JSX_PROPS]?: { engine?: Engine };

	@prop({ type: Object, attribute: false }) engine?: Engine;
}

@customElement('ssr-serialized-engine')
class SsrSerializedEngine extends RadiantElement {
	declare readonly [JSX_PROPS]?: { engine?: Engine; list?: unknown[] };

	@prop({ type: Object }) engine?: Engine;
	@prop({ type: Array }) list?: unknown[];
}

@customElement('ssr-lossy-props')
class SsrLossyProps extends RadiantElement {
	declare readonly [JSX_PROPS]?: { engine?: Engine; list?: unknown[] };

	@prop({ type: Object }) engine?: Engine;
	@prop({ type: Array }) list?: unknown[];
}

function render(markup: () => unknown): string {
	return withRadiantServerCustomElementRenderBridge(() => renderToString(markup() as never, { mode: 'hydrate' }));
}

describe('@prop({ attribute: false }) on the server', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('never serializes a property-only prop holding a class instance', () => {
		const html = render(() => <ssr-property-only engine={new Engine()} />);

		expect(html).not.toContain('engine=');
		expect(html).not.toContain('private');
	});

	test('warns in development when a prop that keeps its attribute holds a class instance', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		render(() => <ssr-serialized-engine engine={new Engine()} />);

		expect(warn).toHaveBeenCalledTimes(1);
		const message = String(warn.mock.calls[0]?.[0]);
		expect(message).toContain('"engine"');
		expect(message).toContain('attribute: false');
	});

	test('warns for a function and for a cycle', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const cycle: unknown[] = [];
		cycle.push(cycle);

		try {
			render(() => <ssr-lossy-props engine={(() => 1) as never} list={cycle} />);
		} catch {
			// a cyclic value still makes JSON.stringify throw; the warning comes first
		}
		expect(warn.mock.calls.map((call) => String(call[0])).join('\n')).toContain('"list"');
		expect(warn.mock.calls.map((call) => String(call[0])).join('\n')).toContain('"engine"');
	});

	test('does not warn for a plain JSON value', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		render(() => <ssr-serialized-engine list={[1, { a: 2 }]} />);

		expect(warn).not.toHaveBeenCalled();
	});
});
