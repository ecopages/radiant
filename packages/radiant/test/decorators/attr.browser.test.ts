import { waitFor } from '@testing-library/dom';
import { describe, expect, test } from 'vitest';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { attr } from '../../src/decorators/attr';
import { customElement } from '../../src/decorators/custom-element';
import { onUpdated } from '../../src/decorators/on-updated';

@customElement('attr-element-test')
class AttrElement extends RadiantElement<{ count: number; state: string | undefined }> {
	@attr({ source: 'data-state' }) state?: string;
	@attr({ bind: true, source: 'data-count', type: Number })
	count = 0;
	@attr({ source: 'data-active', type: Boolean })
	active = false;
}

class AttrController extends RadiantController<{ count: number; state: string | undefined }> {
	@attr({ source: 'data-state' }) state?: string;
	@attr({ source: 'data-count', type: Number }) count = 0;
}

class AttrReconnectController extends RadiantController<{ state: string | undefined }> {
	@attr({ source: 'data-state' }) state?: string;
	updates: string[] = [];

	@onUpdated('state')
	handleStateUpdate() {
		this.updates.push(this.state ?? 'undefined');
	}
}

describe('@attr', () => {
	test('reads and reacts to element attributes', async () => {
		const element = document.createElement('attr-element-test') as AttrElement;
		element.setAttribute('data-state', 'ready');
		element.setAttribute('data-count', '2');
		element.setAttribute('data-active', '');
		document.body.appendChild(element);

		expect(element.state).toBe('ready');
		expect(element.count).toBe(2);
		expect(element.active).toBe(true);
		expect((element as AttrElement & { $count: ReturnType<AttrElement['bind']> }).$count.getValue()).toBe(2);

		element.setAttribute('data-state', 'done');
		element.setAttribute('data-count', '4');
		element.removeAttribute('data-active');

		await waitFor(() => {
			expect(element.state).toBe('done');
			expect(element.bindings.count.getValue()).toBe(4);
			expect(element.active).toBe(false);
		});
	});

	test('writes back through the attribute channel', async () => {
		const element = document.createElement('attr-element-test') as AttrElement;
		document.body.appendChild(element);

		element.state = 'archived';
		element.count = 6;
		element.active = true;

		await waitFor(() => {
			expect(element.getAttribute('data-state')).toBe('archived');
			expect(element.getAttribute('data-count')).toBe('6');
			expect(element.getAttribute('data-active')).toBe('true');
		});
	});
});

describe('RadiantController @attr', () => {
	test('tracks host data attributes reactively', async () => {
		const host = document.createElement('div');
		host.setAttribute('data-state', 'idle');
		host.setAttribute('data-count', '3');
		const controller = new AttrController(host);

		controller.connect();
		expect(controller.state).toBe('idle');
		expect(controller.count).toBe(3);

		host.setAttribute('data-state', 'ready');
		host.setAttribute('data-count', '7');

		await waitFor(() => {
			expect(controller.state).toBe('ready');
			expect(controller.count).toBe(7);
			expect(controller.bindings.state.getValue()).toBe('ready');
		});
	});

	test('does not duplicate attr updates across disconnect and reconnect', async () => {
		const host = document.createElement('div');
		host.setAttribute('data-state', 'idle');
		const controller = new AttrReconnectController(host);

		controller.connect();

		await waitFor(() => {
			expect(controller.state).toBe('idle');
		});

		controller.disconnect();
		host.setAttribute('data-state', 'ready');
		controller.connect();

		await waitFor(() => {
			expect(controller.state).toBe('ready');
		});

		controller.updates.length = 0;
		host.setAttribute('data-state', 'done');

		await waitFor(() => {
			expect(controller.state).toBe('done');
			expect(controller.updates).toEqual(['done']);
		});
	});
});
