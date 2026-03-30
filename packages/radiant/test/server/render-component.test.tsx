import { describe, expect, test } from 'vitest';
import type { ContextProvider } from '../../src/context/context-provider';
import { createContext } from '../../src/context/create-context';
import { consumeContext } from '../../src/context/decorators/consume-context';
import { contextSelector } from '../../src/context/decorators/context-selector';
import { provideContext } from '../../src/context/decorators/provide-context';
import { RadiantComponent } from '../../src/core/radiant-component';
import { customElement } from '../../src/decorators/custom-element';
import { querySlot } from '../../src/decorators/query-slot';
import { createServerRenderEnvironment } from '../../src/server/light-dom-shim';
import {
	createRenderedComponentHeaders,
	RENDERED_COMPONENT_CLIENT_MODULE_HEADER,
	RENDERED_COMPONENT_GENERATED_AT_HEADER,
	RENDERED_COMPONENT_TAG_NAME_HEADER,
	renderComponent,
	renderComponentToPayload,
	renderComponentToString,
	renderStreamableComponent,
	toRenderedComponentPayload,
	type ServerRenderableComponent,
} from '../../src/server/render-component';

declare const __LEGACY_ENVIRONMENT__: boolean;

const describeWhenStandard = __LEGACY_ENVIRONMENT__ ? describe.skip : describe;

@customElement('render-component-card-test')
class RenderComponentCard extends RadiantComponent {
	count = 1;
	label = 'Initial label';

	override render() {
		return (
			<section>
				<p data-count={String(this.count)}>Count: {this.count}</p>
				<p>{this.label}</p>
			</section>
		);
	}
}

@customElement('render-component-loader-card-test')
class RenderComponentLoaderCard extends RadiantComponent {
	message = 'loader default';

	override render() {
		return <p>{this.message}</p>;
	}
}

@customElement('render-component-slot-query-card-test')
class RenderComponentSlotQueryCard extends RadiantComponent {
	@querySlot() defaultSlot!: HTMLParagraphElement | null;
	@querySlot({ name: 'header' }) headerSlot!: HTMLHeadingElement | null;

	override render() {
		return (
			<section
				data-default-slot={this.defaultSlot?.textContent ?? 'missing'}
				data-header-slot={this.headerSlot?.textContent ?? 'missing'}
			>
				<header>
					<slot name="header" />
				</header>
				<div>
					<slot />
				</div>
			</section>
		);
	}
}

const renderComponentContext = createContext<{ label: string }>(Symbol('render-component-context'));

@customElement('render-component-context-card-test')
class RenderComponentContextCard extends RadiantComponent {
	@consumeContext(renderComponentContext) contextProvider!: ContextProvider<typeof renderComponentContext>;

	@contextSelector({ context: renderComponentContext, select: (context) => context.label, subscribe: false })
	updateLabel(label: string) {
		this.setAttribute('data-selected-label', label);
	}

	override render() {
		return (
			<p data-context-provider={this.contextProvider ? 'resolved' : 'missing'}>
				{this.getAttribute('data-selected-label') ?? 'missing'}
			</p>
		);
	}
}

class RenderComponentLogger {
	log(_message: string) {}
}

const renderComponentHydrationContext = createContext<{ count: number; logger: RenderComponentLogger }>(
	Symbol('render-component-hydration-context'),
);

@customElement('render-component-hydrated-provider-test')
class RenderComponentHydratedProvider extends RadiantComponent {
	@provideContext<typeof renderComponentHydrationContext>({
		context: renderComponentHydrationContext,
		initialValue: { count: 0, logger: new RenderComponentLogger() },
		hydrate: Object,
		serialize: ({ count }) => ({ count }),
	})
	provider!: ContextProvider<typeof renderComponentHydrationContext>;

	override render() {
		return <p>Count: {this.provider.getContext().count}</p>;
	}
}

describe('render-component server helpers', () => {
	test('renderComponent() returns the canonical server render descriptor', async () => {
		const rendered = await renderComponent(RenderComponentCard, {
			configure: (component) => {
				component.count = 9;
				component.label = 'Canonical render';
			},
			clientModuleSrc: '/assets/render-component-card.js',
			now: () => new Date('2026-03-27T13:30:00.000Z'),
		});

		expect(rendered).toEqual({
			markup: expect.stringContaining('<render-component-card-test'),
			metadata: {
				clientModuleUrl: '/assets/render-component-card.js',
				generatedAt: '2026-03-27T13:30:00.000Z',
				tagName: 'render-component-card-test',
			},
			preview: expect.any(Object),
		});
		expect(rendered.markup).toContain('Count: 9');
		expect(rendered.markup).toContain('Canonical render');
		expect(createRenderedComponentHeaders(rendered.metadata)).toEqual({
			[RENDERED_COMPONENT_CLIENT_MODULE_HEADER]: '/assets/render-component-card.js',
			[RENDERED_COMPONENT_GENERATED_AT_HEADER]: '2026-03-27T13:30:00.000Z',
			[RENDERED_COMPONENT_TAG_NAME_HEADER]: 'render-component-card-test',
		});
		expect(toRenderedComponentPayload(rendered)).toEqual({
			clientModuleSrc: '/assets/render-component-card.js',
			generatedAt: '2026-03-27T13:30:00.000Z',
			markup: expect.stringContaining('<render-component-card-test'),
			tagName: 'render-component-card-test',
		});
	});

	test('renderComponent() prepares authored content through a server render environment', async () => {
		const rendered = await renderComponent(RenderComponentSlotQueryCard, {
			authoredContent: '<h2 slot="header">Server heading</h2><p>Server body</p>',
			environment: createServerRenderEnvironment(),
		});

		expect(rendered.markup).toContain('data-header-slot="Server heading"');
		expect(rendered.markup).toContain('data-default-slot="Server body"');
		expect(rendered.markup).toContain('<header><h2 slot="header">Server heading</h2></header>');
		expect(rendered.markup).toContain('<div><p>Server body</p></div>');
	});

	test('renderComponent() lets adapters prepare host content before slot-aware SSR', async () => {
		const rendered = await renderComponent(RenderComponentSlotQueryCard, {
			prepareHost: (host) => {
				host.insertAdjacentHTML('beforeend', '<h2 slot="header">Prepared heading</h2><p>Prepared body</p>');
			},
		});

		expect(rendered.markup).toContain('data-header-slot="Prepared heading"');
		expect(rendered.markup).toContain('data-default-slot="Prepared body"');
		expect(rendered.markup).toContain('<header><h2 slot="header">Prepared heading</h2></header>');
	});

	test('renderComponent() exposes ambient SSR context to standalone consumers', async () => {
		const rendered = await renderComponent(RenderComponentContextCard, {
			ssrContext: [{ context: renderComponentContext, value: { label: 'SSR context value' } }],
		});

		expect(rendered.markup).toContain('data-context-provider="resolved"');
		expect(rendered.markup).toContain('SSR context value');
	});

	describeWhenStandard('provider hydration markup', () => {
		test('renderComponent() emits valid provider hydration markup without client-only fields', async () => {
			const rendered = await renderComponent(RenderComponentHydratedProvider, {
				configure: (component) => {
					component.provider.setContext({ count: 5 });
				},
			});

			expect(rendered.markup).toContain(
				'<script type="application/json" data-hydration data-hydration-type="context" data-hydration-key="provider">{"count":5}</script>',
			);
			expect(rendered.markup).not.toContain('&quot;');
			expect(rendered.markup).not.toContain('logger');
		});
	});

	test('renderStreamableComponent() infers metadata and returns preview output', async () => {
		const now = new Date('2026-03-27T12:00:00.000Z');
		let resolvedComponent: CustomElementConstructor | undefined;

		const rendered = await renderStreamableComponent(RenderComponentCard, {
			configure: (component) => {
				component.count = 7;
				component.label = 'Configured label';
			},
			now: () => now,
			resolveClientModuleSrc: (component) => {
				resolvedComponent = component;
				return '/assets/render-component-card.js';
			},
		});

		expect(resolvedComponent).toBe(RenderComponentCard);
		expect(rendered.generatedAt).toBe(now.toISOString());
		expect(rendered.clientModuleSrc).toBe('/assets/render-component-card.js');
		expect(rendered.tagName).toBe('render-component-card-test');
		expect(rendered.markup).toContain('<render-component-card-test');
		expect(rendered.markup).toContain('Count: 7');
		expect(rendered.markup).toContain('Configured label');
		expect(rendered.preview).toEqual(expect.any(Object));

		const headers = createRenderedComponentHeaders(rendered);
		expect(headers).toEqual({
			[RENDERED_COMPONENT_CLIENT_MODULE_HEADER]: '/assets/render-component-card.js',
			[RENDERED_COMPONENT_GENERATED_AT_HEADER]: now.toISOString(),
			[RENDERED_COMPONENT_TAG_NAME_HEADER]: 'render-component-card-test',
		});
	});

	test('renderComponentToPayload() accepts load() options and omits preview output', async () => {
		const payload = await renderComponentToPayload({
			load: async () => RenderComponentLoaderCard,
			configure: (component) => {
				component.message = 'Loaded message';
			},
			clientModuleSrc: '/assets/loader-card.js',
		});

		expect(payload).toEqual({
			clientModuleSrc: '/assets/loader-card.js',
			generatedAt: expect.any(String),
			markup: '<render-component-loader-card-test><p>Loaded message</p></render-component-loader-card-test>',
			tagName: 'render-component-loader-card-test',
		});
	});

	test('renderComponentToString() returns markup for constructor calls', async () => {
		const markup = await renderComponentToString(RenderComponentCard, {
			configure: (component) => {
				component.count = 3;
				component.label = 'String only';
			},
		});

		expect(markup).toContain('<render-component-card-test');
		expect(markup).toContain('Count: 3');
		expect(markup).toContain('String only');
	});

	test('createRenderedComponentHeaders() omits client module header when absent', () => {
		expect(
			createRenderedComponentHeaders({
				generatedAt: '2026-03-27T12:00:00.000Z',
				markup: '<plain-render-card></plain-render-card>',
				tagName: 'plain-render-card',
			}),
		).toEqual({
			[RENDERED_COMPONENT_GENERATED_AT_HEADER]: '2026-03-27T12:00:00.000Z',
			[RENDERED_COMPONENT_TAG_NAME_HEADER]: 'plain-render-card',
		});
	});

	test('renderStreamableComponent() throws when tag metadata is missing', async () => {
		class UntaggedRenderable implements ServerRenderableComponent {
			renderHostToString(): string {
				return '<untagged-renderable></untagged-renderable>';
			}
		}

		await expect(
			renderStreamableComponent(
				UntaggedRenderable as unknown as CustomElementConstructor & { new (): UntaggedRenderable },
			),
		).rejects.toThrow('UntaggedRenderable is missing @customElement metadata.');
	});

	test('renderComponent() rejects host preparation for non-element renderables', async () => {
		class StringOnlyRenderable implements ServerRenderableComponent {
			renderHostToString(): string {
				return '<string-only-renderable></string-only-renderable>';
			}
		}

		await expect(
			renderComponent(
				StringOnlyRenderable as unknown as CustomElementConstructor & { new (): StringOnlyRenderable },
				{
					prepareHost: () => {},
				},
			),
		).rejects.toThrow(
			'StringOnlyRenderable cannot prepare SSR host content because it does not expose an innerHTML host surface.',
		);
	});

	test('concurrent renders resolve independent SSR context values', async () => {
		const concurrentContext = createContext<{ id: number }>(Symbol('concurrent-context'));

		@customElement('concurrent-context-card-test')
		class ConcurrentContextCard extends RadiantComponent {
			@consumeContext(concurrentContext) provider!: ContextProvider<typeof concurrentContext>;

			@contextSelector({ context: concurrentContext, select: (ctx) => ctx.id, subscribe: false })
			applyId(id: number) {
				this.setAttribute('data-id', String(id));
			}

			override render() {
				return <p data-id={this.getAttribute('data-id') ?? 'missing'}>Card</p>;
			}
		}

		const [markupA, markupB] = await Promise.all([
			renderComponentToString(ConcurrentContextCard, {
				ssrContext: [{ context: concurrentContext, value: { id: 1 } }],
			}),
			renderComponentToString(ConcurrentContextCard, {
				ssrContext: [{ context: concurrentContext, value: { id: 2 } }],
			}),
		]);

		expect(markupA).toContain('data-id="1"');
		expect(markupB).toContain('data-id="2"');
	});
});
