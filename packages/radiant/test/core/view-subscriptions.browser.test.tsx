import { computed, state, type State } from '@ecopages/signals';
import { afterEach, describe, expect, test } from 'vitest';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';

/** A module-level signal that counts its subscribers. */
function countedSignal<T>(initial: T) {
	const inner: State<T> = state(initial);
	let subscribers = 0;

	return {
		signal: {
			get: () => inner.get(),
			subscribe(notify: (value: T) => void) {
				subscribers += 1;
				const release = inner.subscribe(notify);
				return () => {
					subscribers -= 1;
					release();
				};
			},
		},
		set: (value: T) => inner.set(value),
		subscribers: () => subscribers,
	};
}

let tag = 0;
const nextTag = () => `view-subscriptions-${++tag}`;

afterEach(() => {
	document.body.innerHTML = '';
});

describe('signals a host view binds directly', () => {
	test('an element releases them on disconnect and catches up on reconnect', async () => {
		const label = countedSignal('a');
		const hidden = countedSignal(false);
		const tagName = nextTag();

		@customElement(tagName)
		class Panel extends RadiantElement {
			override render() {
				return <p hidden={hidden.signal}>{label.signal}</p>;
			}
		}

		const host = document.createElement(tagName) as Panel;
		document.body.append(host);
		await host.updateComplete;

		expect([label.subscribers(), hidden.subscribers()]).toEqual([1, 1]);

		host.remove();

		expect([label.subscribers(), hidden.subscribers()]).toEqual([0, 0]);

		label.set('b');
		hidden.set(true);

		expect(host.querySelector('p')!.textContent).toBe('a');

		document.body.append(host);
		await host.updateComplete;

		expect([label.subscribers(), hidden.subscribers()]).toEqual([1, 1]);
		expect(host.querySelector('p')!.textContent).toBe('b');
		expect(host.querySelector('p')!.hidden).toBe(true);

		label.set('c');

		expect(host.querySelector('p')!.textContent).toBe('c');
	});

	test('a branch that changed while detached mounts its new bindings on reconnect', async () => {
		const open = countedSignal(false);
		const detail = countedSignal('first');
		const tagName = nextTag();

		const branch = computed(() => (open.signal.get() ? <p>{detail.signal}</p> : <span>closed</span>));

		@customElement(tagName)
		class Disclosure extends RadiantElement {
			override render() {
				return <div>{branch}</div>;
			}
		}

		const host = document.createElement(tagName) as Disclosure;
		document.body.append(host);
		await host.updateComplete;
		host.remove();
		open.set(true);
		document.body.append(host);
		await host.updateComplete;

		expect(host.querySelector('p')!.textContent).toBe('first');
		expect(detail.subscribers()).toBe(1);

		host.remove();

		expect([open.subscribers(), detail.subscribers()]).toEqual([0, 0]);

		document.body.append(host);

		detail.set('second');

		expect(host.querySelector('p')!.textContent).toBe('second');
	});

	test('a controller releases them on disconnect and catches up on reconnect', async () => {
		const label = countedSignal('a');

		class Label extends RadiantController {
			override render() {
				return <p>{label.signal}</p>;
			}
		}

		const element = document.createElement('div');
		document.body.append(element);
		const controller = new Label(element);
		controller.connect();
		await controller.updateComplete;

		expect(label.subscribers()).toBe(1);

		controller.disconnect();

		expect(label.subscribers()).toBe(0);

		label.set('b');
		controller.connect();
		await controller.updateComplete;

		expect(label.subscribers()).toBe(1);
		expect(element.querySelector('p')!.textContent).toBe('b');
	});
});
