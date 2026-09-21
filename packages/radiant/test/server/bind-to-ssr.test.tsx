// @vitest-environment node
import '../../src/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { withRadiantServerCustomElementRenderBridge } from '../../src/server/element-ssr/radiant-element-ssr-bridge';
import { describe, expect, it } from 'vitest';
import { bindTo } from '../../src/decorators/bind-to';
import { customElement } from '../../src/decorators/custom-element';
import { prop } from '../../src/decorators/prop';
import { RadiantElement } from '../../src/core/radiant-element';

@customElement('bind-to-ssr-attr-host')
class BindToSsrAttrHost extends RadiantElement {
	@prop({ type: String, defaultValue: '' })
	@bindTo({ selector: '[data-bind-target]', attr: 'value' })
	value: string;

	override render() {
		return <slot />;
	}
}

@customElement('bind-to-ssr-bool-host')
class BindToSsrBoolHost extends RadiantElement {
	@prop({ type: Boolean, defaultValue: false })
	@bindTo({ selector: '[data-bind-trigger]', attr: 'aria-expanded' })
	open: boolean;

	override render() {
		return <slot />;
	}
}

@customElement('bind-to-ssr-text-host')
class BindToSsrTextHost extends RadiantElement {
	@prop({ type: String, defaultValue: '' })
	@bindTo({ selector: '[data-bind-target]', text: true })
	label: string;

	override render() {
		return <slot />;
	}
}

describe('@bindTo SSR', () => {
	it('copies a reactive field onto a light-DOM child attribute', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<bind-to-ssr-attr-host value="synced">
					<input type="text" data-bind-target />
				</bind-to-ssr-attr-host>,
			),
		);

		expect(html).toMatch(/<input[^>]*data-bind-target[^>]*value="synced"/);
	});

	it('copies a boolean field onto a light-DOM child attribute', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<bind-to-ssr-bool-host open={true}>
					<button type="button" data-bind-trigger />
				</bind-to-ssr-bool-host>,
			),
		);

		expect(html).toMatch(/<button[^>]*data-bind-trigger[^>]*aria-expanded="true"/);
	});

	it('copies a reactive field onto a light-DOM child text content', () => {
		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<bind-to-ssr-text-host label="Synced">
					<span data-bind-target />
				</bind-to-ssr-text-host>,
			),
		);

		expect(html).toMatch(/<span[^>]*data-bind-target[^>]*>Synced<\/span>/);
	});
});
