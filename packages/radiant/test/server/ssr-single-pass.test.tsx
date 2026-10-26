import '../../src/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, test } from 'vitest';
import {
	type ContextProvider,
	consumeContext,
	contextSelector,
	createContext,
	provideContext,
} from '../../src/context';
import { RadiantElement } from '../../src/core/radiant-element';
import { registerSsrPreparationCallback } from '../../src/core/ssr-preparation';
import { customElement } from '../../src/decorators/custom-element';
import { onUpdated } from '../../src/decorators/on-updated';
import { prop } from '../../src/decorators/prop';
import { resolveSsrContextProvider } from '../../src/server/context-ssr';
import { renderRadiantElementHostToString } from '../../src/server/radiant-element-ssr';
import { renderComponent } from '../../src/server/render-component';

@customElement('ssr-once-count-card')
class SsrOnceCountCard extends RadiantElement {
	renderCount = 0;
	prepareCount = 0;

	constructor() {
		super();
		registerSsrPreparationCallback(this, () => {
			this.prepareCount += 1;
		});
	}

	override render() {
		this.renderCount += 1;
		return (
			<p>
				render={this.renderCount}; prepared={this.prepareCount}
			</p>
		);
	}
}

@customElement('ssr-once-prepared-card')
class SsrOncePreparedCard extends RadiantElement {
	prepareCount = 0;
	label = '0';

	constructor() {
		super();
		registerSsrPreparationCallback(this, () => {
			this.prepareCount += 1;
			this.label = String(this.prepareCount);
			this.setAttribute('data-prepared', String(this.prepareCount));
		});
	}

	override render() {
		return <p>{this.label}</p>;
	}
}

const regListContext = createContext<{ items: string[] }>(Symbol('ssr-once-reg-list'));

@customElement('ssr-once-reg-item')
class SsrOnceRegItem extends RadiantElement {
	constructor() {
		super();
		registerSsrPreparationCallback(this, () => {
			const provider = resolveSsrContextProvider(regListContext) as
				ContextProvider<typeof regListContext> | undefined;
			const items = provider?.getContext().items;

			if (!provider || !items || items.includes('a')) {
				return;
			}

			provider.setContext({ items: [...items, 'a'] });
		});
	}
}

@customElement('ssr-once-reg-list')
class SsrOnceRegList extends RadiantElement {
	@provideContext({
		context: regListContext,
		initialValue: { items: [] as string[] },
		hydrate: Object,
	})
	list!: ContextProvider<typeof regListContext>;

	override render() {
		return <ssr-once-reg-item />;
	}
}

const selectorContext = createContext<{ items: string[] }>(Symbol('ssr-once-selector'));
let selectorDeliveries = 0;

@customElement('ssr-once-selector-child')
class SsrOnceSelectorChild extends RadiantElement {
	@contextSelector({ context: selectorContext, select: (value) => value.items })
	protected onItems(_items: string[]): void {
		selectorDeliveries += 1;
	}

	override render() {
		return <p>selector child</p>;
	}
}

const onUpdatedContext = createContext<{ n: number }>(Symbol('ssr-once-onupdated'));

@customElement('ssr-once-onupdated-child')
class SsrOnceOnUpdatedChild extends RadiantElement {
	@consumeContext(onUpdatedContext)
	context!: ContextProvider<typeof onUpdatedContext>;

	@prop({ type: Number })
	value = 0;

	@onUpdated('value')
	protected pushValue(): void {
		this.context.setContext({ n: this.value });
	}

	override render() {
		return <p>{this.context.getContext().n}</p>;
	}
}

@customElement('ssr-once-onupdated-parent')
class SsrOnceOnUpdatedParent extends RadiantElement {
	@provideContext({
		context: onUpdatedContext,
		initialValue: { n: 0 },
		hydrate: Object,
	})
	store!: ContextProvider<typeof onUpdatedContext>;

	override render() {
		return <ssr-once-onupdated-child value={4} />;
	}
}

@customElement('ssr-once-selector-parent')
class SsrOnceSelectorParent extends RadiantElement {
	@provideContext({
		context: selectorContext,
		initialValue: { items: [] as string[] },
	})
	list!: ContextProvider<typeof selectorContext>;

	override render() {
		return <ssr-once-selector-child />;
	}
}

describe('SSR host serialization runs as one pass', () => {
	test('One renderComponent call renders and prepares the host once', async () => {
		let host: SsrOnceCountCard | undefined;
		const rendered = await renderComponent(SsrOnceCountCard, {
			initialize: (component) => {
				host = component;
			},
			renderOptions: { mode: 'plain' },
		});

		expect(host?.renderCount).toBe(1);
		expect(host?.prepareCount).toBe(1);
		expect(renderToString(rendered.preview)).toBe(rendered.markup);
	});

	test('Host attributes and content come from the same preparation', async () => {
		const rendered = await renderComponent(SsrOncePreparedCard);
		const prepared = rendered.markup.match(/data-prepared="(\d+)"/)?.[1];
		const text = rendered.markup.match(/<p>(\d+)<\/p>/)?.[1];

		expect(prepared).toBeDefined();
		expect(prepared).toBe(text);
	});

	test('A provider payload includes values written by nested hosts during preparation', async () => {
		expect(customElements.get('ssr-once-reg-item')).toBe(SsrOnceRegItem);

		const rendered = await renderComponent(SsrOnceRegList, {
			renderOptions: { mode: 'hydrate' },
		});

		expect(rendered.markup).toContain(
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="list">{"items":["a"]}</script>',
		);
	});

	test('a nested @contextSelector method runs once per serialization', async () => {
		expect(customElements.get('ssr-once-selector-child')).toBe(SsrOnceSelectorChild);
		selectorDeliveries = 0;
		await renderComponent(SsrOnceSelectorParent);
		expect(selectorDeliveries).toBe(1);
	});

	test('an @onUpdated callback can use consumeContext during the same serialization', async () => {
		expect(customElements.get('ssr-once-onupdated-child')).toBe(SsrOnceOnUpdatedChild);

		const rendered = await renderComponent(SsrOnceOnUpdatedParent);

		expect(rendered.markup).toContain('<p>4</p>');
		expect(rendered.markup).toContain(
			'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="store">{"n":4}</script>',
		);
	});

	test('a second explicit render after a state change updates both attributes and content', () => {
		const host = new SsrOncePreparedCard();
		const first = renderRadiantElementHostToString(host);

		expect(first).toMatch(/data-prepared="1"/);
		expect(first).toContain('<p>1</p>');

		host.label = 'stale';
		const second = renderRadiantElementHostToString(host);

		expect(second).toMatch(/data-prepared="2"/);
		expect(second).toContain('<p>2</p>');
		expect(second).not.toContain('<p>stale</p>');
	});
});
