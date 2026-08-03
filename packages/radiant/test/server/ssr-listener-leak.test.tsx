import '../../src/server/install-ssr-runtime';
import { isServer } from '@ecopages/radiant/is-server';
import { renderRadiantElementHostToString } from '../../src/server/radiant-element-ssr';
import { renderComponent } from '../../src/server/render-component';
import { createContext, consumeContext, type ContextProvider } from '../../src/context';
import { customElement } from '../../src/decorators/custom-element';
import { onUpdated } from '../../src/decorators/on-updated';
import { onEvent } from '../../src/decorators/on-event';
import { prop } from '../../src/decorators/prop';
import { onContextUpdate } from '../../src/context/decorators/on-context-update';
import { RadiantElement } from '../../src/core/radiant-element';
import { createEventListener } from '../../src/helpers/create-event-listener';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

function parseCommaSeparated(value: string): string[] {
	return value
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);
}

@customElement('ssr-nav-toc-like')
class SsrNavTocLike extends RadiantElement {
	@prop({ type: String, attribute: 'navigation-events', defaultValue: '' }) navigationEvents = '';

	private navigationCleanups: Array<() => void> = [];

	@onUpdated(['navigationEvents'])
	onNavigationEventsUpdated(): void {
		this.detachNavigationListeners();
		this.attachNavigationListeners();
	}

	private attachNavigationListeners(): void {
		if (isServer || !this.isConnected) {
			return;
		}

		const handler = () => {};
		for (const eventName of parseCommaSeparated(this.navigationEvents)) {
			document.addEventListener(eventName, handler);
			this.navigationCleanups.push(() => document.removeEventListener(eventName, handler));
		}
	}

	private detachNavigationListeners(): void {
		for (const cleanup of this.navigationCleanups) {
			cleanup();
		}
		this.navigationCleanups = [];
	}
}

@customElement('ssr-create-event-doc')
class SsrCreateEventDoc extends RadiantElement {
	constructor() {
		super();
		createEventListener(this, { document: true, type: 'eco:page-load' }, () => {});
	}
}

@customElement('ssr-on-event-doc')
class SsrOnEventDoc extends RadiantElement {
	@onEvent({ document: true, type: 'eco:page-load' })
	onPageLoad(): void {}
}

const listenerLeakContext = createContext<{ label: string }>(Symbol('ssr-listener-leak-context'));

@customElement('ssr-listener-leak-context-card')
class SsrListenerLeakContextCard extends RadiantElement {
	@consumeContext(listenerLeakContext) contextProvider!: ContextProvider<typeof listenerLeakContext>;

	@onContextUpdate({ context: listenerLeakContext, select: (context) => context.label, subscribe: false })
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

describe('SSR navigation listener leak', () => {
	let documentAddSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		documentAddSpy = vi.spyOn(document, 'addEventListener');
	});

	afterEach(() => {
		documentAddSpy.mockRestore();
	});

	test('TOC-like @onUpdated navigation wiring does not register document listeners during SSR prop sets', () => {
		for (let i = 0; i < 24; i++) {
			const toc = new SsrNavTocLike();
			toc.navigationEvents = 'eco:page-load,eco:after-swap';
			renderRadiantElementHostToString(toc, { mode: 'hydrate' });
		}

		expect(documentAddSpy.mock.calls.filter(([type]) => type === 'eco:page-load')).toHaveLength(0);
		expect(documentAddSpy.mock.calls.filter(([type]) => type === 'eco:after-swap')).toHaveLength(0);
	});

	test('createEventListener and @onEvent do not register document listeners during SSR', () => {
		for (let i = 0; i < 12; i++) {
			renderRadiantElementHostToString(new SsrCreateEventDoc(), { mode: 'hydrate' });
			renderRadiantElementHostToString(new SsrOnEventDoc(), { mode: 'hydrate' });
		}

		expect(documentAddSpy.mock.calls.filter(([type]) => type === 'eco:page-load')).toHaveLength(0);
	});

	test('createEventListener preserves controller scope validation during SSR', () => {
		const host = {
			host: document.createElement('div'),
			isConnected: false,
			registerCleanupCallback: () => {},
			registerConnectedCallback: () => {},
		};

		expect(() =>
			createEventListener(host, { selector: '.target', scope: 'shadow', type: 'click' }, () => {}),
		).toThrow('RadiantController event listeners only support light DOM scope.');
	});

	test('nested SSR context providers still resolve while navigation listeners are suppressed', async () => {
		documentAddSpy.mockRestore();

		const rendered = await renderComponent(SsrListenerLeakContextCard, {
			ssrContext: [{ context: listenerLeakContext, value: { label: 'nested-context' } }],
		});

		expect(rendered.markup).toContain('data-context-provider="resolved"');
		expect(rendered.markup).toContain('nested-context');
	});
});
