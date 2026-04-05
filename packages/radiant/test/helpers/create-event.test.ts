import { beforeEach, describe, expect, test } from 'vitest';
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

class ShadowListenerHelperElement extends RadiantElement {
	shadowClicks = 0;
	bothClicks = 0;

	constructor() {
		super();
		const shadowRoot = this.attachShadow({ mode: 'open' });
		const shadowButton = document.createElement('button');
		shadowButton.setAttribute('data-ref', 'shadow-btn');
		shadowButton.textContent = 'Shadow';
		const sharedShadowButton = document.createElement('button');
		sharedShadowButton.setAttribute('data-ref', 'shared-btn');
		sharedShadowButton.textContent = 'Shared Shadow';
		shadowRoot.append(shadowButton, sharedShadowButton);
	}

	override connectedCallback(): void {
		super.connectedCallback();
		createEventListener(this, { ref: 'shadow-btn', type: 'click', scope: 'shadow' }, () => {
			this.shadowClicks += 1;
		});
		createEventListener(this, { ref: 'shared-btn', type: 'click', scope: 'both' }, () => {
			this.bothClicks += 1;
		});
	}
}

customElements.define('shadow-listener-helper-element', ShadowListenerHelperElement);

class LateShadowListenerHelperElement extends RadiantElement {
	lateShadowClicks = 0;

	constructor() {
		super();
		createEventListener(this, { ref: 'late-shadow-btn', type: 'click', scope: 'shadow' }, () => {
			this.lateShadowClicks += 1;
		});
	}

	override connectedCallback(): void {
		super.connectedCallback();
		if (!this.shadowRoot) {
			const shadowRoot = this.attachShadow({ mode: 'open' });
			const button = document.createElement('button');
			button.setAttribute('data-ref', 'late-shadow-btn');
			button.textContent = 'Late Shadow';
			shadowRoot.appendChild(button);
		}
	}
}

customElements.define('late-shadow-listener-helper-element', LateShadowListenerHelperElement);

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

	test('subscribes to events in shadow DOM when scope is shadow', () => {
		const host = document.createElement('shadow-listener-helper-element') as ShadowListenerHelperElement;
		document.body.appendChild(host);

		const shadowButton = host.shadowRoot?.querySelector('[data-ref="shadow-btn"]');
		shadowButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

		expect(host.shadowClicks).toBe(1);
	});

	test('subscribes across light and shadow DOM when scope is both', () => {
		const host = document.createElement('shadow-listener-helper-element') as ShadowListenerHelperElement;
		const lightButton = document.createElement('button');
		lightButton.setAttribute('data-ref', 'shared-btn');
		host.appendChild(lightButton);
		document.body.appendChild(host);

		const shadowButton = host.shadowRoot?.querySelector('[data-ref="shared-btn"]');
		lightButton.click();
		shadowButton?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

		expect(host.bothClicks).toBe(2);
	});

	test('attaches shadow listeners when the shadow root is created after connect', () => {
		const host = document.createElement('late-shadow-listener-helper-element') as LateShadowListenerHelperElement;
		document.body.appendChild(host);

		host.shadowRoot
			?.querySelector('[data-ref="late-shadow-btn"]')
			?.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

		expect(host.lateShadowClicks).toBe(1);
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
});
