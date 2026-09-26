// @vitest-environment node
import '../../src/server/install-ssr-runtime';
import { renderToString } from '@ecopages/jsx/server';
import { state as createState, type WritableSignal } from '@ecopages/signals';
import { beforeEach, describe, expect, it } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { onUpdated } from '../../src/decorators/on-updated';
import { prop } from '../../src/decorators/prop';
import { signal } from '../../src/decorators/signal';
import { state } from '../../src/decorators/state';
import { withRadiantServerCustomElementRenderBridge } from '../../src/server/element-ssr/radiant-element-ssr-bridge';

const calls: string[] = [];

@customElement('ssr-update-cycle-host')
class SsrUpdateCycleHost extends RadiantElement {
	@prop({ type: String, defaultValue: '' }) label!: string;
	@state upper = '';
	@state echoed = '';

	@onUpdated('label')
	onLabel(): void {
		calls.push('label');
		this.upper = this.label.toUpperCase();
	}

	@onUpdated('upper')
	onUpper(): void {
		calls.push('upper');
		this.echoed = `${this.upper}!`;
	}

	protected override updated(): void {
		calls.push('updated');
	}

	override render() {
		return <span>{this.echoed}</span>;
	}
}

let subscriptions = 0;
const inner = createState(0);
const countedSource: WritableSignal<number> = {
	get: () => inner.get(),
	set: (value) => inner.set(value),
	update: (updater) => inner.update(updater),
	subscribe: (notify) => {
		subscriptions += 1;
		const unsubscribe = inner.subscribe(notify);
		return () => {
			subscriptions -= 1;
			unsubscribe();
		};
	},
};

@customElement('ssr-update-cycle-shared-host')
class SsrSharedSourceHost extends RadiantElement {
	@signal({ source: countedSource }) count!: WritableSignal<number>;

	@onUpdated('count')
	onCount(): void {}

	override render() {
		return <span>{String(this.count.get())}</span>;
	}
}

@customElement('ssr-focus-layout-host')
class SsrFocusLayoutHost extends RadiantElement {
	@prop({ type: Boolean, defaultValue: true }) open!: boolean;

	@onUpdated('open')
	onOpen(): void {
		this.getBoundingClientRect();
		this.getClientRects();
		queueMicrotask(() => {
			(this.querySelector('button') ?? this).focus();
			this.blur();
		});
	}

	override render() {
		return <button type="button">ok</button>;
	}
}

function renderHost(element: unknown): string {
	return withRadiantServerCustomElementRenderBridge(() => renderToString(element as never));
}

describe('UpdateCycle SSR', () => {
	beforeEach(() => {
		calls.length = 0;
	});

	it('registers each host under its tag', () => {
		expect([
			customElements.get('ssr-update-cycle-host'),
			customElements.get('ssr-update-cycle-shared-host'),
			customElements.get('ssr-focus-layout-host'),
		]).toEqual([SsrUpdateCycleHost, SsrSharedSourceHost, SsrFocusLayoutHost]);
	});

	it('runs cascading @onUpdated callbacks during preparation and never calls updated()', () => {
		const html = renderHost(<ssr-update-cycle-host label="hello" />);

		expect(html).toContain('HELLO!');
		expect(calls).toEqual(['label', 'upper']);
	});

	it('does not flush after serialization', async () => {
		renderHost(<ssr-update-cycle-host label="hello" />);
		const afterRender = [...calls];

		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(calls).toEqual(afterRender);
	});

	it('offers no-op focus and layout so @onUpdated can call them during SSR', async () => {
		const element = document.createElement('div');
		const rect = element.getBoundingClientRect();

		expect(rect).toMatchObject({ x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 });
		expect(element.getClientRects().item(0)).toMatchObject({ x: 0, y: 0, width: 0, height: 0 });

		expect(() => renderHost(<ssr-focus-layout-host open />)).not.toThrow();
		await new Promise<void>((resolve) => queueMicrotask(resolve));
	});

	it('leaves no subscriptions on a shared @signal source after rendering', () => {
		renderHost(<ssr-update-cycle-shared-host />);
		renderHost(<ssr-update-cycle-shared-host />);

		expect(subscriptions).toBe(0);
	});
});
