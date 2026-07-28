import { waitFor } from '@testing-library/dom';
import { state as createSignalState } from '@ecopages/signals';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { state } from '../../src/decorators/state';
import { createResource, type ResourceRequestContext } from '../../src/signals/host-resource';

function flushMicrotasks(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

function createFetcher(delay = 0) {
	return vi.fn((cityId: string, { signal }: Pick<ResourceRequestContext<ResourceComponent>, 'signal'>) => {
		return new Promise<string>((resolve, reject) => {
			const timer = setTimeout(() => resolve(`weather:${cityId}`), delay);
			signal.addEventListener('abort', () => {
				clearTimeout(timer);
				reject(new DOMException('Aborted', 'AbortError'));
			});
		});
	});
}

let connectFetcher = createFetcher();
let reconnectFetcher = createFetcher();
let stateFetcher = createFetcher();

@customElement('resource-component-connect-test')
class ResourceComponent extends RadiantElement {
	cityId = createSignalState('venice');

	weather = createResource(this, {
		source: (ctx) => ctx.host.cityId.get(),
		fetcher: (cityId, ctx) => connectFetcher(cityId, ctx),
	});

	override render() {
		return (
			<section>
				<p data-ref="status">{this.weather.status.get()}</p>
				<p data-ref="value">{this.weather.data.get() ?? 'none'}</p>
			</section>
		);
	}
}

@customElement('resource-component-reconnect-test')
class ResourceReconnectComponent extends RadiantElement {
	cityId = createSignalState('venice');

	weather = createResource(this, {
		source: (ctx) => ctx.host.cityId.get(),
		fetcher: (cityId, ctx) => reconnectFetcher(cityId, ctx),
	});

	override render() {
		return <p data-ref="value">{this.weather.data.get() ?? 'none'}</p>;
	}
}

@customElement('resource-component-state-source-test')
class ResourceStateSourceComponent extends RadiantElement {
	@state cityId = 'venice';

	weather = createResource(this, {
		source: (ctx) => ctx.host.cityId,
		fetcher: (cityId, ctx) => stateFetcher(cityId, ctx),
	});

	override render() {
		return (
			<section>
				<p data-ref="status">{this.weather.status.get()}</p>
				<p data-ref="value">{this.weather.data.get() ?? 'none'}</p>
			</section>
		);
	}
}

describe('createResource', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
		connectFetcher = createFetcher();
		reconnectFetcher = createFetcher();
		stateFetcher = createFetcher();
	});

	test('starts fetching on connect and rerenders from sourced updates', async () => {
		const element = document.createElement('resource-component-connect-test') as ResourceComponent;

		expect(connectFetcher).not.toHaveBeenCalled();

		document.body.appendChild(element);

		await waitFor(() => {
			expect(connectFetcher).toHaveBeenCalledTimes(1);
			expect(element.querySelector('[data-ref="status"]')?.textContent).toBe('success');
			expect(element.querySelector('[data-ref="value"]')?.textContent).toBe('weather:venice');
		});

		element.cityId.set('madrid');

		await waitFor(() => {
			expect(connectFetcher).toHaveBeenCalledTimes(2);
			expect(element.querySelector('[data-ref="value"]')?.textContent).toBe('weather:madrid');
		});
	});

	test('stops observing while disconnected and resumes from the latest source on reconnect', async () => {
		const element = document.createElement('resource-component-reconnect-test') as ResourceReconnectComponent;
		document.body.appendChild(element);

		await waitFor(() => {
			expect(reconnectFetcher).toHaveBeenCalledTimes(1);
			expect(element.querySelector('[data-ref="value"]')?.textContent).toBe('weather:venice');
		});

		element.remove();
		element.cityId.set('tokio');
		await flushMicrotasks();

		expect(reconnectFetcher).toHaveBeenCalledTimes(1);

		document.body.appendChild(element);

		await waitFor(() => {
			expect(reconnectFetcher).toHaveBeenCalledTimes(2);
			expect(element.querySelector('[data-ref="value"]')?.textContent).toBe('weather:tokio');
		});
	});

	test('tracks @state property reads in source without an explicit .get() or refetch()', async () => {
		const element = document.createElement('resource-component-state-source-test') as ResourceStateSourceComponent;

		document.body.appendChild(element);

		await waitFor(() => {
			expect(stateFetcher).toHaveBeenCalledTimes(1);
			expect(element.querySelector('[data-ref="status"]')?.textContent).toBe('success');
			expect(element.querySelector('[data-ref="value"]')?.textContent).toBe('weather:venice');
		});

		element.cityId = 'madrid';

		await waitFor(() => {
			expect(stateFetcher).toHaveBeenCalledTimes(2);
			expect(element.querySelector('[data-ref="value"]')?.textContent).toBe('weather:madrid');
		});
	});
});
