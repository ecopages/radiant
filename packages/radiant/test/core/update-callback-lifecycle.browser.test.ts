import { state as createSignalState, type WritableSignal } from '@ecopages/signals';
import { afterEach, describe, expect, test } from 'vitest';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { bindTo } from '../../src/decorators/bind-to';
import { customElement } from '../../src/decorators/custom-element';
import { signal } from '../../src/decorators/signal';

afterEach(() => {
	document.body.innerHTML = '';
});

/** A shared source that counts the listeners currently attached to it. */
function createCountedSource(initial: number) {
	const source = createSignalState(initial);
	const subscribe = source.subscribe.bind(source);
	const counter = { listeners: 0 };

	source.subscribe = (notify) => {
		counter.listeners++;
		const unsubscribe = subscribe(notify);
		let released = false;

		return () => {
			if (!released) {
				released = true;
				counter.listeners--;
			}

			unsubscribe();
		};
	};

	return { source, counter };
}

const flush = () => Promise.resolve();

describe('update callback subscriptions follow host connection', () => {
	const elementSource = createCountedSource(1);
	const controllerSource = createCountedSource(1);

	@customElement('update-callback-bind-to-element')
	class BindToElement extends RadiantElement {
		@bindTo({ attr: 'data-n' })
		@signal({ source: elementSource.source })
		n!: WritableSignal<number>;
	}

	@customElement('update-callback-raw-element')
	class RawElement extends RadiantElement {
		@signal({ source: elementSource.source })
		n!: WritableSignal<number>;
		seen: number[] = [];
		stop?: () => void;

		override connectedCallback(): void {
			super.connectedCallback();
			this.stop ??= this.registerUpdateCallback('n', () => this.seen.push(this.n.get()));
		}
	}

	class BindToController extends RadiantController {
		@bindTo({ attr: 'data-n' })
		@signal({ source: controllerSource.source })
		n!: WritableSignal<number>;
	}

	test('@bindTo on an Element Host releases its listener on disconnect and re-syncs on reconnect', async () => {
		elementSource.source.set(1);
		const element = document.createElement('update-callback-bind-to-element') as BindToElement;
		document.body.append(element);
		await flush();

		expect(element.getAttribute('data-n')).toBe('1');
		expect(elementSource.counter.listeners).toBeGreaterThan(0);

		element.remove();
		expect(elementSource.counter.listeners).toBe(0);

		elementSource.source.set(2);
		expect(element.getAttribute('data-n')).toBe('1');

		document.body.append(element);
		await flush();
		expect(element.getAttribute('data-n')).toBe('2');

		elementSource.source.set(3);
		expect(element.getAttribute('data-n')).toBe('3');
	});

	test('repeated connect and disconnect does not accumulate listeners', async () => {
		const element = document.createElement('update-callback-bind-to-element') as BindToElement;
		document.body.append(element);
		await flush();
		const connectedListeners = elementSource.counter.listeners;

		for (let i = 0; i < 3; i++) {
			element.remove();
			expect(elementSource.counter.listeners).toBe(0);
			document.body.append(element);
			await flush();
			expect(elementSource.counter.listeners).toBe(connectedListeners);
		}

		element.remove();
		expect(elementSource.counter.listeners).toBe(0);
	});

	test('@bindTo on a Controller Host releases its listener on disconnect and re-syncs on reconnect', () => {
		controllerSource.source.set(1);
		const target = document.createElement('section');
		document.body.append(target);
		const controller = new BindToController(target);
		controller.connect();

		expect(target.getAttribute('data-n')).toBe('1');
		expect(controllerSource.counter.listeners).toBeGreaterThan(0);

		controller.disconnect();
		expect(controllerSource.counter.listeners).toBe(0);

		controllerSource.source.set(2);
		expect(target.getAttribute('data-n')).toBe('1');

		controller.connect();
		expect(target.getAttribute('data-n')).toBe('2');

		for (let i = 0; i < 3; i++) {
			const connectedListeners = controllerSource.counter.listeners;
			controller.disconnect();
			controller.connect();
			expect(controllerSource.counter.listeners).toBe(connectedListeners);
		}

		controller.disconnect();
		expect(controllerSource.counter.listeners).toBe(0);
	});

	test('registerUpdateCallback stops on disconnect and runs again on reconnect when the value changed', async () => {
		elementSource.source.set(1);
		const element = document.createElement('update-callback-raw-element') as RawElement;
		document.body.append(element);
		await flush();
		element.seen.length = 0;

		elementSource.source.set(2);
		expect(element.seen).toEqual([2]);

		element.remove();
		expect(elementSource.counter.listeners).toBe(0);
		elementSource.source.set(3);
		expect(element.seen).toEqual([2]);

		document.body.append(element);
		await flush();
		expect(element.seen).toEqual([2, 3]);

		elementSource.source.set(4);
		expect(element.seen).toEqual([2, 3, 4]);

		element.remove();
		document.body.append(element);
		await flush();
		expect(element.seen).toEqual([2, 3, 4]);
	});

	test('registerUpdateCallback on a Controller Host stops on disconnect', () => {
		controllerSource.source.set(1);
		const target = document.createElement('section');
		const controller = new BindToController(target);
		const seen: number[] = [];
		controller.registerUpdateCallback('n', () => seen.push(controller.n.get()));
		controller.connect();
		seen.length = 0;

		controllerSource.source.set(2);
		expect(seen).toEqual([2]);

		controller.disconnect();
		expect(controllerSource.counter.listeners).toBe(0);
		controllerSource.source.set(3);
		expect(seen).toEqual([2]);

		controller.connect();
		expect(seen).toEqual([2, 3]);
		controller.disconnect();
	});

	test('registerUpdateCallback does not run when the value changed and changed back while detached', async () => {
		elementSource.source.set(1);
		const element = document.createElement('update-callback-raw-element') as RawElement;
		document.body.append(element);
		await flush();
		element.seen.length = 0;

		element.remove();
		elementSource.source.set(2);
		elementSource.source.set(1);
		document.body.append(element);
		await flush();

		expect(element.seen).toEqual([]);
	});

	test('a disposed registerUpdateCallback stays released across reconnect', async () => {
		elementSource.source.set(1);
		const element = document.createElement('update-callback-raw-element') as RawElement;
		document.body.append(element);
		await flush();
		element.seen.length = 0;

		element.remove();
		element.stop?.();
		elementSource.source.set(2);
		document.body.append(element);
		await flush();
		elementSource.source.set(3);

		expect(element.seen).toEqual([]);
	});

	test('registerUpdateCallback on a Controller Host that was never connected does not subscribe', () => {
		controllerSource.source.set(1);
		const controller = new BindToController(document.createElement('section'));
		const seen: number[] = [];
		controller.registerUpdateCallback('n', () => seen.push(controller.n.get()));

		expect(controllerSource.counter.listeners).toBe(0);
		controllerSource.source.set(2);
		expect(seen).toEqual([]);

		controller.connect();
		seen.length = 0;
		controllerSource.source.set(3);
		expect(seen).toEqual([3]);
		controller.disconnect();
	});
});

describe('update callbacks that disconnect their host during the connect pass', () => {
	const aSource = createCountedSource(1);
	const bSource = createCountedSource(1);

	class DisconnectingController extends RadiantController {
		@signal({ source: aSource.source })
		a!: WritableSignal<number>;
		@signal({ source: bSource.source })
		b!: WritableSignal<number>;
	}

	test('leave no subscription behind and keep unvisited members for the next connect', () => {
		aSource.source.set(1);
		bSource.source.set(1);
		const controller = new DisconnectingController(document.createElement('section'));
		const seenB: number[] = [];
		controller.registerUpdateCallback('a', () => controller.disconnect());
		controller.registerUpdateCallback('b', () => seenB.push(controller.b.get()));
		controller.connect();
		controller.disconnect();

		aSource.source.set(2);
		bSource.source.set(2);
		controller.connect();

		expect(aSource.counter.listeners).toBe(0);
		expect(bSource.counter.listeners).toBe(0);
		expect(seenB).toEqual([]);

		controller.connect();
		expect(seenB).toEqual([2]);
		controller.disconnect();
		expect(bSource.counter.listeners).toBe(0);
	});
});

describe('update callbacks that disconnect and reconnect their host during the connect pass', () => {
	const aSource = createCountedSource(1);
	const bSource = createCountedSource(1);

	class ReconnectingController extends RadiantController {
		@signal({ source: aSource.source })
		a!: WritableSignal<number>;
		@signal({ source: bSource.source })
		b!: WritableSignal<number>;
	}

	test('leave one subscription per member, released on the final disconnect', () => {
		aSource.source.set(1);
		bSource.source.set(1);
		const controller = new ReconnectingController(document.createElement('section'));
		controller.connect();
		controller.disconnect();

		aSource.source.set(2);
		bSource.source.set(2);
		let reconnected = false;
		let connectRuns = 0;
		controller.registerConnectedCallback(() => connectRuns++);
		controller.registerUpdateCallback('a', () => {
			if (!reconnected) {
				reconnected = true;
				controller.disconnect();
				controller.connect();
			}
		});
		controller.connect();

		expect(connectRuns).toBe(1);
		expect(aSource.counter.listeners).toBe(3);
		expect(bSource.counter.listeners).toBe(2);
		controller.disconnect();
		expect(aSource.counter.listeners).toBe(0);
		expect(bSource.counter.listeners).toBe(0);
	});
});

describe('update callbacks follow a member replaced before connect or while detached', () => {
	const source = createCountedSource(1);

	class ReplacedController extends RadiantController {
		@signal({ source: source.source })
		n!: WritableSignal<number>;
	}

	function setup() {
		source.source.set(1);
		const controller = new ReplacedController(document.createElement('section'));
		const seen: number[] = [];
		controller.registerUpdateCallback('n', () => seen.push(controller.getReactiveMember<number>('n')!.get()));
		return { controller, seen };
	}

	test('run on reconnect for a different value, then follow the replacement', () => {
		const { controller, seen } = setup();
		controller.connect();
		controller.disconnect();

		const replacement = createSignalState(7);
		controller.registerReactiveMember('n', replacement);
		controller.connect();
		expect(seen).toEqual([7]);

		replacement.set(8);
		expect(seen).toEqual([7, 8]);
		controller.disconnect();
	});

	test('stay silent on reconnect for an equal value', () => {
		const { controller, seen } = setup();
		controller.connect();
		controller.disconnect();

		controller.registerReactiveMember('n', createSignalState(1));
		controller.connect();
		expect(seen).toEqual([]);
		controller.disconnect();
	});

	test('compare a member replaced before the first connect with its first registration', () => {
		const different = setup();
		different.controller.registerReactiveMember('n', createSignalState(7));
		different.controller.connect();
		expect(different.seen).toEqual([7]);
		different.controller.disconnect();

		const equal = setup();
		equal.controller.registerReactiveMember('n', createSignalState(1));
		equal.controller.connect();
		expect(equal.seen).toEqual([]);
		equal.controller.disconnect();
	});
});

describe('connection callbacks after one that disconnects the host', () => {
	const source = createCountedSource(1);

	class ConnectController extends RadiantController {
		@signal({ source: source.source })
		n!: WritableSignal<number>;
	}

	test('do not run, and leave nothing subscribed', () => {
		const controller = new ConnectController(document.createElement('section'));
		let laterRuns = 0;
		controller.registerConnectedCallback(() => controller.disconnect());
		controller.registerConnectedCallback(() => laterRuns++);
		controller.connect();

		expect(laterRuns).toBe(0);
		expect(source.counter.listeners).toBe(0);
	});
});

describe('a member registered by a callback during the connect pass', () => {
	const aSource = createCountedSource(1);
	const cSource = createCountedSource(1);

	class RegisteringController extends RadiantController {
		@signal({ source: aSource.source })
		a!: WritableSignal<number>;
	}

	test('is subscribed once and released on disconnect', () => {
		aSource.source.set(1);
		const controller = new RegisteringController(document.createElement('section'));
		controller.connect();
		controller.disconnect();

		aSource.source.set(2);
		controller.registerUpdateCallback('a', () => {
			if (!controller.getReactiveMember('c')) {
				controller.registerReactiveMember('c', cSource.source);
			}
		});
		controller.connect();
		expect(cSource.counter.listeners).toBe(1);

		controller.disconnect();
		expect(cSource.counter.listeners).toBe(0);
	});
});
