import { jsx } from '@ecopages/jsx';
import { State, subtle } from '@ecopages/signals';
import { waitFor } from '@testing-library/dom';
import { describe, expect, test } from 'vitest';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { state } from '../../src/decorators/state';

const counts = { watched: 0, unwatched: 0 };
const shared = new State(0, {
	[subtle.watched]() {
		counts.watched += 1;
	},
	[subtle.unwatched]() {
		counts.unwatched += 1;
	},
});

@customElement('tracked-render-order-host')
class OrderHost extends RadiantElement {
	@state tick = 0;

	override render() {
		return `${this.tick}:${shared.get()}`;
	}
}

class OrderController extends RadiantController<{ tick: number }> {
	@state tick = 0;

	override render() {
		return jsx('p', { children: `${this.tick}:${shared.get()}` });
	}
}

describe('TrackedRender watch order in hosts', () => {
	test('an element keeps a shared dependency watched across re-renders and releases it on disconnect', async () => {
		counts.watched = 0;
		counts.unwatched = 0;
		const host = document.createElement('tracked-render-order-host') as OrderHost;
		document.body.append(host);
		await host.updateComplete;
		for (let tick = 1; tick <= 4; tick += 1) {
			host.tick = tick;
			await waitFor(() => expect(host.textContent).toBe(`${tick}:0`));
		}
		expect(counts).toEqual({ watched: 1, unwatched: 0 });
		host.remove();
		expect(counts).toEqual({ watched: 1, unwatched: 1 });
		document.body.append(host);
		await host.updateComplete;
		expect(counts).toEqual({ watched: 2, unwatched: 1 });
		host.tick = 5;
		await waitFor(() => expect(host.textContent).toBe('5:0'));
		expect(counts).toEqual({ watched: 2, unwatched: 1 });
		shared.set(1);
		await waitFor(() => expect(host.textContent).toBe('5:1'));
		shared.set(0);
		host.remove();
	});

	test('a controller keeps a shared dependency watched across re-renders and releases it on disconnect', async () => {
		counts.watched = 0;
		counts.unwatched = 0;
		const host = document.createElement('div');
		const controller = new OrderController(host);
		controller.connect();
		for (let tick = 1; tick <= 4; tick += 1) {
			controller.tick = tick;
			await waitFor(() => expect(host.textContent).toBe(`${tick}:0`));
		}
		expect(counts).toEqual({ watched: 1, unwatched: 0 });
		controller.disconnect();
		expect(counts).toEqual({ watched: 1, unwatched: 1 });
	});
});
