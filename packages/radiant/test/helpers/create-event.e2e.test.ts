import { beforeEach, describe, expect, test, vi } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { createEvent } from '../../src/helpers/create-event';
import { createEventListener } from '../../src/helpers/create-event-listener';
import type { EventEmitter } from '../../src/tools/event-emitter';

class EventHelperElement extends RadiantElement {
	declare customEvent: EventEmitter<{ value: string }>;

	override connectedCallback(): void {
		super.connectedCallback();
		this.customEvent = createEvent(this, {
			name: 'custom-event',
			bubbles: true,
			composed: true,
		});
	}
}

customElements.define('event-helper-element', EventHelperElement);

class EventListenerHelperElement extends RadiantElement {
	receivedValue = '';

	override connectedCallback(): void {
		super.connectedCallback();
		createEventListener(this, { selector: 'event-helper-element', type: 'custom-event' }, (e: Event) => {
			this.receivedValue = (e as CustomEvent<{ value: string }>).detail.value;
		});
	}
}

customElements.define('event-listener-helper-element', EventListenerHelperElement);

function createMatchMediaMock() {
	const instances: Array<
		MediaQueryList & {
			dispatchChange: (matches: boolean) => void;
		}
	> = [];

	const matchMedia = vi.fn((query: string) => {
		const listeners = new Set<(event: MediaQueryListEvent) => void>();
		const mediaQueryList = {
			matches: false,
			media: query,
			addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
				listeners.add(listener);
			},
			removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
				listeners.delete(listener);
			},
			dispatchChange(matches: boolean) {
				for (const listener of listeners) {
					listener({ matches } as MediaQueryListEvent);
				}
			},
		} as MediaQueryList & { dispatchChange: (matches: boolean) => void };

		instances.push(mediaQueryList);
		return mediaQueryList;
	});

	return { instances, matchMedia };
}

describe('createEvent', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('creates an event emitter that dispatches events', () => {
		const listener = document.createElement('event-listener-helper-element') as EventListenerHelperElement;
		const emitter = document.createElement('event-helper-element') as EventHelperElement;
		listener.appendChild(emitter);
		document.body.appendChild(listener);

		expect(listener.receivedValue).toBe('');

		emitter.customEvent.emit({ value: 'Hello, World!' });
		expect(listener.receivedValue).toBe('Hello, World!');
	});
});

describe('createEventListener', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('subscribes to events via delegation', () => {
		const listener = document.createElement('event-listener-helper-element') as EventListenerHelperElement;
		const emitter = document.createElement('event-helper-element') as EventHelperElement;
		listener.appendChild(emitter);
		document.body.appendChild(listener);

		emitter.customEvent.emit({ value: 'delegated' });
		expect(listener.receivedValue).toBe('delegated');
	});

	test('subscribes to events by ref', () => {
		const host = document.createElement('event-helper-element') as EventHelperElement;
		const button = document.createElement('button');
		button.setAttribute('data-ref', 'test-btn');
		host.appendChild(button);
		document.body.appendChild(host);

		let clicked = false;
		createEventListener(host, { ref: 'test-btn', type: 'click' }, () => {
			clicked = true;
		});

		button.click();
		expect(clicked).toBe(true);
	});

	test('subscribes to events by ref when the click lands on a descendant', () => {
		const host = document.createElement('event-helper-element') as EventHelperElement;
		const button = document.createElement('button');
		button.setAttribute('data-ref', 'nested-btn');
		const icon = document.createElement('span');
		icon.textContent = '★';
		button.appendChild(icon);
		host.appendChild(button);
		document.body.appendChild(host);

		let clicked = false;
		createEventListener(host, { ref: 'nested-btn', type: 'click' }, () => {
			clicked = true;
		});

		icon.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(clicked).toBe(true);
	});

	test('subscribes to events by ref when the ref contains selector metacharacters', () => {
		const host = document.createElement('event-helper-element') as EventHelperElement;
		const button = document.createElement('button');
		const ref = 'button"[]\\ref';
		button.setAttribute('data-ref', ref);
		host.appendChild(button);
		document.body.appendChild(host);

		let clicked = false;
		createEventListener(host, { ref, type: 'click' }, () => {
			clicked = true;
		});

		button.click();
		expect(clicked).toBe(true);
	});

	test('returns a cleanup function', () => {
		const host = document.createElement('event-helper-element') as EventHelperElement;
		const button = document.createElement('button');
		button.setAttribute('data-ref', 'cleanup-btn');
		host.appendChild(button);
		document.body.appendChild(host);

		let clickCount = 0;
		const cleanup = createEventListener(host, { ref: 'cleanup-btn', type: 'click' }, () => {
			clickCount++;
		});

		button.click();
		expect(clickCount).toBe(1);

		cleanup();
		button.click();
		expect(clickCount).toBe(1);
	});

	test('cleanup permanently unsubscribes the helper listener', () => {
		const host = document.createElement('event-helper-element') as EventHelperElement;
		const button = document.createElement('button');
		button.setAttribute('data-ref', 'dispose-btn');
		host.appendChild(button);
		document.body.appendChild(host);

		let clickCount = 0;
		const cleanup = createEventListener(host, { ref: 'dispose-btn', type: 'click' }, () => {
			clickCount += 1;
		});

		button.click();
		cleanup();
		host.remove();
		document.body.appendChild(host);
		button.click();

		expect(clickCount).toBe(1);
	});

	test('subscribes to media query changes', () => {
		const { instances, matchMedia } = createMatchMediaMock();
		vi.stubGlobal('matchMedia', matchMedia);

		const host = document.createElement('event-helper-element') as EventHelperElement;
		document.body.appendChild(host);

		let matches: boolean | null = null;
		createEventListener(host, { mediaQuery: '(prefers-color-scheme: dark)', type: 'change' }, (event) => {
			matches = (event as MediaQueryListEvent).matches;
		});

		const mediaQueryList = instances[0];
		mediaQueryList?.dispatchChange(true);
		expect(matches).toBe(true);

		host.remove();
		vi.unstubAllGlobals();
	});

	test('cleanup permanently unsubscribes media query listeners', () => {
		const { instances, matchMedia } = createMatchMediaMock();
		vi.stubGlobal('matchMedia', matchMedia);

		const host = document.createElement('event-helper-element') as EventHelperElement;
		document.body.appendChild(host);

		let matches: boolean | null = null;
		const cleanup = createEventListener(
			host,
			{ mediaQuery: '(prefers-color-scheme: dark)', type: 'change' },
			(event) => {
				matches = (event as MediaQueryListEvent).matches;
			},
		);

		const mediaQueryList = instances[0];
		mediaQueryList?.dispatchChange(true);
		expect(matches).toBe(true);

		matches = null;
		cleanup();
		mediaQueryList?.dispatchChange(false);
		expect(matches).toBeNull();

		host.remove();
		vi.unstubAllGlobals();
	});
});
