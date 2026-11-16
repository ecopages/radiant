import { waitFor } from '@testing-library/dom';
import { state as signalState } from '@ecopages/signals';
import type { WritableSignal } from '@ecopages/signals';
import { afterEach, describe, expect, test } from 'vitest';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import type { ReadonlyReactiveState } from '../../src/core/reactivity-contract';
import { attr } from '../../src/decorators/attr';
import { bindTo } from '../../src/decorators/bind-to';
import { customElement } from '../../src/decorators/custom-element';
import { onUpdated } from '../../src/decorators/on-updated';
import { prop } from '../../src/decorators/prop';
import { signal } from '../../src/decorators/signal';
import { state } from '../../src/decorators/state';

afterEach(() => {
	document.body.innerHTML = '';
});

/** A bare `{ get, subscribe }` source with no `set`, like a store selector. */
function createReadonlySource<T>(initial: T) {
	let current = initial;
	const listeners = new Set<(value: T) => void>();
	const member: ReadonlyReactiveState<T> = {
		get: () => current,
		subscribe(notify) {
			listeners.add(notify);
			return () => listeners.delete(notify);
		},
	};
	return {
		member,
		listenerCount: () => listeners.size,
		push(next: T) {
			current = next;
			for (const notify of [...listeners]) notify(next);
		},
	};
}

describe('read-only reactive members on an element', () => {
	test('this.$ binds the member and follows its changes', () => {
		const source = createReadonlySource(1);

		@customElement('readonly-member-binding')
		class BindingHost extends RadiantElement<{ count: number }> {
			constructor() {
				super();
				this.registerReactiveMember('count', source.member);
			}
		}

		const element = document.createElement('readonly-member-binding') as BindingHost;
		document.body.appendChild(element);

		expect(element.$.count.getValue()).toBe(1);
		const seen: number[] = [];
		element.$.count.subscribe((value) => seen.push(value));

		source.push(2);

		expect(element.$.count.getValue()).toBe(2);
		expect(seen).toEqual([2]);
	});

	test('@onUpdated fires when the member changes and the host is connected', async () => {
		const source = createReadonlySource(1);
		const calls: number[] = [];

		@customElement('readonly-member-updated')
		class UpdatedHost extends RadiantElement<{ count: number }> {
			constructor() {
				super();
				this.registerReactiveMember('count', source.member);
			}

			@onUpdated('count')
			onCount() {
				calls.push(source.member.get());
			}
		}

		const element = document.createElement('readonly-member-updated') as UpdatedHost;
		document.body.appendChild(element);
		await Promise.resolve();
		calls.length = 0;

		source.push(5);

		await waitFor(() => expect(calls).toEqual([5]));
		element.remove();
		expect(source.listenerCount()).toBe(0);
	});

	test('@bindTo writes the member onto the DOM and tracks changes', async () => {
		const source = createReadonlySource('one');

		@customElement('readonly-member-bind-to')
		class BindToHost extends RadiantElement<{ label: string }> {
			constructor() {
				super();
				this.registerReactiveMember('label', source.member);
			}

			@bindTo({ ref: 'out', text: true })
			label!: string;
		}

		const element = document.createElement('readonly-member-bind-to') as BindToHost;
		element.innerHTML = '<span data-ref="out"></span>';
		document.body.appendChild(element);
		await Promise.resolve();

		expect(element.querySelector('[data-ref="out"]')?.textContent).toBe('one');

		source.push('two');

		expect(element.querySelector('[data-ref="out"]')?.textContent).toBe('two');
	});

	test('prepareForSsr observes the member and runs @onUpdated for a change since construction', () => {
		const source = createReadonlySource(1);
		const calls: number[] = [];

		@customElement('readonly-member-ssr')
		class SsrHost extends RadiantElement<{ count: number }> {
			constructor() {
				super();
				this.registerReactiveMember('count', source.member);
			}

			@onUpdated('count')
			onCount() {
				calls.push(source.member.get());
			}
		}

		const element = document.createElement('readonly-member-ssr') as SsrHost;
		source.push(7);

		element.prepareForSsr();

		expect(calls).toEqual([7]);
		expect(source.listenerCount()).toBe(0);
	});
});

describe('replacing a member keeps working across the read-only split', () => {
	test('a read-only member replaces a writable one and drives this.$', () => {
		const source = createReadonlySource(10);
		customElements.define('readonly-replace-writable', class extends RadiantElement<{ count: number }> {});
		const host = document.createElement('readonly-replace-writable') as RadiantElement<{ count: number }>;
		host.createReactiveMember('count', 1);

		host.registerReactiveMember('count', source.member);

		expect(host.$.count.getValue()).toBe(10);
		source.push(11);
		expect(host.$.count.getValue()).toBe(11);
	});

	test('a writable member replaces a read-only one without throwing', () => {
		customElements.define('readonly-replace-readonly', class extends RadiantElement<{ count: number }> {});
		const host = document.createElement('readonly-replace-readonly') as RadiantElement<{ count: number }>;
		host.registerReactiveMember('count', createReadonlySource(1).member);

		const next = host.createReactiveMember('count', 2);
		next.set(3);

		expect(host.$.count.getValue()).toBe(3);
	});
});

describe('a read-only member over a writable field', () => {
	const message = /"count" is a writable field and cannot be replaced by a read-only member/;

	test('registerReactiveMember throws after @state installed the field', () => {
		@customElement('readonly-over-state')
		class Host extends RadiantElement<{ count: number }> {
			@state count = 0;
		}
		const element = new Host();

		expect(() => element.registerReactiveMember('count', createReadonlySource(1).member)).toThrow(message);
		element.count = 4;
		expect(element.$.count.getValue()).toBe(4);
	});

	test('registerReactiveMember throws after @prop installed the field', () => {
		@customElement('readonly-over-prop')
		class Host extends RadiantElement<{ count: number }> {
			@prop({ type: Number, defaultValue: 0 }) count = 0;
		}

		const element = new Host();

		expect(() => element.registerReactiveMember('count', createReadonlySource(1).member)).toThrow(message);
		expect(element.$.count.getValue()).toBe(0);
	});

	test('registerReactiveMember throws after createReactiveField on an element', () => {
		customElements.define('readonly-over-field', class extends RadiantElement<{ count: number }> {});
		const element = document.createElement('readonly-over-field') as RadiantElement<{ count: number }>;
		element.createReactiveField('count', 0);

		expect(() => element.registerReactiveMember('count', createReadonlySource(1).member)).toThrow(message);
		expect(element.$.count.getValue()).toBe(0);
	});

	test('registerReactiveMember throws after createReactiveField on a controller', () => {
		const controller = new RadiantController<{ count: number }>(document.createElement('div'));
		controller.createReactiveField('count', 0);

		expect(() => controller.registerReactiveMember('count', createReadonlySource(1).member)).toThrow(message);
		expect(controller.$.count.getValue()).toBe(0);
	});

	test('registerReactiveMember throws after createReactiveProp on a controller', () => {
		const controller = new RadiantController<{ count: number }>(document.createElement('div'));
		controller.createReactiveProp('count', { type: Number, defaultValue: 0 });

		expect(() => controller.registerReactiveMember('count', createReadonlySource(1).member)).toThrow(message);
		expect(controller.$.count.getValue()).toBe(0);
	});

	test('a writable member still replaces a writable field member', () => {
		const controller = new RadiantController<{ count: number }>(document.createElement('div'));
		controller.createReactiveField('count', 0);
		const next = signalState(5);

		controller.registerReactiveMember('count', next);

		expect(controller.$.count.getValue()).toBe(5);
	});

	test('a read-only member replaces a plain member on a controller', () => {
		const source = createReadonlySource(10);
		const controller = new RadiantController<{ count: number }>(document.createElement('div'));
		controller.createReactiveMember('count', 1);

		controller.registerReactiveMember('count', source.member);

		expect(controller.$.count.getValue()).toBe(10);
		source.push(11);
		expect(controller.$.count.getValue()).toBe(11);
	});
});

describe('writable decorators on a name held by a read-only member', () => {
	const message = /"count" is already registered as a read-only member/;

	class ReadonlyBase extends RadiantElement<{ count: number }> {
		constructor() {
			super();
			this.registerReactiveMember('count', createReadonlySource(1).member);
		}
	}

	test('@prop throws', () => {
		@customElement('readonly-collision-prop')
		class Host extends ReadonlyBase {
			@prop({ type: Number, defaultValue: 0 }) count = 0;
		}

		expect(() => new Host()).toThrow(message);
	});

	test('@state throws', () => {
		@customElement('readonly-collision-state')
		class Host extends ReadonlyBase {
			@state count = 0;
		}

		expect(() => new Host()).toThrow(message);
	});

	test('@attr throws', () => {
		@customElement('readonly-collision-attr')
		class Host extends ReadonlyBase {
			@attr({ type: Number, defaultValue: 0 }) count = 0;
		}

		expect(() => new Host()).toThrow(message);
	});

	test('@signal throws', () => {
		@customElement('readonly-collision-signal')
		class Host extends ReadonlyBase {
			@signal({ initial: 0 }) count!: WritableSignal<number>;
		}

		expect(() => new Host()).toThrow(message);
	});

	test('createReactiveField throws', () => {
		class Host extends ReadonlyBase {
			constructor() {
				super();
				this.createReactiveField('count', 0);
			}
		}
		customElements.define('readonly-collision-field', Host);

		expect(() => new Host()).toThrow(message);
	});
});

describe('read-only reactive members on a controller', () => {
	test('this.$, @onUpdated and @bindTo work on a connected controller', async () => {
		const source = createReadonlySource(1);
		const calls: number[] = [];
		const host = document.createElement('div');
		host.innerHTML = '<span data-ref="out"></span>';

		class ReadonlyController extends RadiantController<{ count: number }> {
			constructor(el: Element) {
				super(el);
				this.registerReactiveMember('count', source.member);
			}

			@bindTo({ ref: 'out', text: true })
			count!: number;

			@onUpdated('count')
			onCount() {
				calls.push(source.member.get());
			}
		}

		const controller = new ReadonlyController(host);
		controller.connect();
		await Promise.resolve();
		calls.length = 0;

		expect(controller.$.count.getValue()).toBe(1);
		expect(host.querySelector('[data-ref="out"]')?.textContent).toBe('1');

		source.push(3);

		expect(controller.$.count.getValue()).toBe(3);
		expect(host.querySelector('[data-ref="out"]')?.textContent).toBe('3');
		await waitFor(() => expect(calls).toEqual([3]));

		controller.disconnect();
	});

	test('createReactiveProp throws on a name held by a read-only member', () => {
		const controller = new RadiantController<{ count: number }>(document.createElement('div'));
		controller.registerReactiveMember('count', createReadonlySource(1).member);

		expect(() => controller.createReactiveProp('count', { type: Number, defaultValue: 0 })).toThrow(
			/"count" is already registered as a read-only member/,
		);
	});
});
