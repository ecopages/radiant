import { computed, state } from '@ecopages/signals';
import { describe, expect, test } from 'vitest';
import { createRoot, pauseSubscriptions, resumeSubscriptions } from '../src/index.ts';
import { jsx } from '../src/jsx-runtime.ts';

function counted<T>(initial: T) {
	const inner = state(initial);
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

describe('pauseSubscriptions and resumeSubscriptions', () => {
	test('a paused root releases child, text-content and attribute sources and applies what changed on resume', () => {
		const child = counted('a');
		const title = counted('t1');
		const hidden = counted(false);
		const container = document.createElement('div');
		createRoot(container).render(
			jsx('section', {
				hidden: hidden.signal,
				children: [jsx('p', { children: child.signal }), jsx('textarea', { children: title.signal })],
			}),
		);

		expect([child.subscribers(), title.subscribers(), hidden.subscribers()]).toEqual([1, 1, 1]);

		pauseSubscriptions(container);

		expect([child.subscribers(), title.subscribers(), hidden.subscribers()]).toEqual([0, 0, 0]);

		child.set('b');
		hidden.set(true);

		expect(container.querySelector('p')!.textContent).toBe('a');
		expect(container.querySelector('section')!.hidden).toBe(false);

		resumeSubscriptions(container);

		expect([child.subscribers(), title.subscribers(), hidden.subscribers()]).toEqual([1, 1, 1]);
		expect(container.querySelector('p')!.textContent).toBe('b');
		expect(container.querySelector('section')!.hidden).toBe(true);
		expect(container.querySelector('textarea')!.value).toBe('t1');

		title.set('t2');

		expect(container.querySelector('textarea')!.value).toBe('t2');
	});

	test('a source unchanged while paused is not applied again on resume', () => {
		const child = counted('a');
		const container = document.createElement('div');
		createRoot(container).render(jsx('p', { children: child.signal }));
		const text = container.querySelector('p')!.firstChild;

		pauseSubscriptions(container);
		resumeSubscriptions(container);

		expect(container.querySelector('p')!.firstChild).toBe(text);
	});

	test('a branch replaced on resume releases the bindings it removed and subscribes the ones it mounts', () => {
		const open = state(false);
		const inside = counted('x');
		const outside = counted('y');
		const branch = computed(() =>
			open.get() ? jsx('b', { children: inside.signal }) : jsx('i', { children: outside.signal }),
		);
		const container = document.createElement('div');
		createRoot(container).render(jsx('div', { children: branch }));

		pauseSubscriptions(container);
		open.set(true);
		resumeSubscriptions(container);

		expect(container.querySelector('b')!.textContent).toBe('x');
		expect([inside.subscribers(), outside.subscribers()]).toEqual([1, 0]);
	});

	test('another root is not paused', () => {
		const shared = counted('a');
		const paused = document.createElement('div');
		const live = document.createElement('div');
		createRoot(paused).render(jsx('p', { children: shared.signal }));
		createRoot(live).render(jsx('p', { children: shared.signal }));

		pauseSubscriptions(paused);
		shared.set('b');

		expect(paused.textContent).toBe('a');
		expect(live.textContent).toBe('b');
		expect(shared.subscribers()).toBe(1);
	});
});
