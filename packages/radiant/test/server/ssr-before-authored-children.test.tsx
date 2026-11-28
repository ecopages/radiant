// @vitest-environment node
import '../../src/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { ContextProvider, createContext, provideContext, resolveSsrContextValue } from '../../src/context';
import { RadiantElement } from '../../src/core/radiant-element';
import { registerSsrPreparationCallback } from '../../src/core/ssr-preparation';
import { customElement } from '../../src/decorators/custom-element';
import { prop } from '../../src/decorators/prop';
import { withRadiantServerCustomElementRenderBridge } from '../../src/server/element-ssr/radiant-element-ssr-bridge';
import { renderComponentToString } from '../../src/server/render-component';

const labelContext = createContext<{ early: string; late: string }>(Symbol('before-authored-children-label'));

@customElement('before-authored-children-provider')
class BeforeAuthoredChildrenProvider extends RadiantElement {
	@prop({ type: String, defaultValue: '' }) label: string;

	@provideContext({ context: labelContext, initialValue: { early: '', late: '' } })
	provider: ContextProvider<typeof labelContext>;

	constructor() {
		super();
		registerSsrPreparationCallback(
			this,
			() => this.provider.setContext({ ...this.provider.getContext(), early: this.label }),
			'beforeAuthoredChildren',
		);
		registerSsrPreparationCallback(this, () =>
			this.provider.setContext({ ...this.provider.getContext(), late: this.label }),
		);
	}
}

@customElement('before-authored-children-reader')
class BeforeAuthoredChildrenReader extends RadiantElement {
	constructor() {
		super();
		registerSsrPreparationCallback(this, () => {
			const value = resolveSsrContextValue(labelContext);
			this.setAttribute('data-early', value?.early ?? 'none');
			this.setAttribute('data-late', value?.late ?? 'none');
		});
	}
}

@customElement('before-authored-children-root')
class BeforeAuthoredChildrenRoot extends RadiantElement {
	constructor() {
		super();
		registerSsrPreparationCallback(
			this,
			() => this.setAttribute('data-content-at-phase', this.innerHTML === '' ? 'empty' : 'filled'),
			'beforeAuthoredChildren',
		);
	}
}

describe('registerSsrPreparationCallback with beforeAuthoredChildren', () => {
	it('lets a child read context published from host props, but not context a default callback sets', () => {
		expect([BeforeAuthoredChildrenProvider, BeforeAuthoredChildrenReader]).toBeDefined();

		const html = withRadiantServerCustomElementRenderBridge(() =>
			renderToString(
				<before-authored-children-provider label="from-props">
					<before-authored-children-reader />
				</before-authored-children-provider>,
			),
		);

		expect(html).toContain('data-early="from-props"');
		expect(html).toMatch(/\sdata-late(?=[\s>])/);
		expect(html).not.toContain('data-late="from-props"');
	});

	it('runs again for each serialization of the same host', () => {
		const page = (
			<before-authored-children-provider label="again">
				<before-authored-children-reader />
			</before-authored-children-provider>
		);

		for (let pass = 0; pass < 2; pass += 1) {
			const html = withRadiantServerCustomElementRenderBridge(() => renderToString(page));
			expect(html).toContain('data-early="again"');
		}
	});

	it('runs for a host rendered with renderComponent, before its authored content is applied', async () => {
		const html = await renderComponentToString(BeforeAuthoredChildrenRoot, {
			authoredContent: '<p>Authored</p>',
			renderOptions: { mode: 'plain' },
		});

		expect(html).toContain('data-content-at-phase="empty"');
		expect(html).toContain('<p>Authored</p>');
	});
});
