import { waitFor } from '@testing-library/dom';
import { beforeEach, describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { event } from '../../src/decorators/event';
import { onEvent } from '../../src/decorators/on-event';
import { onUpdated } from '../../src/decorators/on-updated';
import { prop } from '../../src/decorators/prop';
import { query } from '../../src/decorators/query';
import { state } from '../../src/decorators/state';
import { createEvent } from '../../src/helpers/create-event';
import { createEventListener } from '../../src/helpers/create-event-listener';
import { createQuery } from '../../src/helpers/create-query';
import type { EventEmitter } from '../../src/tools/event-emitter';

type CounterSnapshot = {
	count: number;
	draft: string;
	attribute: string | null;
	status: string | null;
	detail: string | null;
};

type CounterElementContract = RadiantElement & {
	count: number;
	draft: string;
	actionButton: HTMLButtonElement | null;
	statusNode: HTMLSpanElement | null;
	detailNode: HTMLParagraphElement | null;
};

function readCounterSnapshot(element: CounterElementContract): CounterSnapshot {
	return {
		count: element.count,
		draft: element.draft,
		attribute: element.getAttribute('count'),
		status: element.querySelector('[data-ref="status"]')?.textContent ?? null,
		detail: element.querySelector('[data-ref="detail"]')?.textContent ?? null,
	};
}

function counterTemplate(count: number, draft: string): string {
	return [
		'<button data-ref="action">Increment</button>',
		`<span data-ref="status">Count: ${count}</span>`,
		`<p data-ref="detail">Draft: ${draft}</p>`,
	].join('');
}

class DecoratorCounterParityElement extends RadiantElement {
	@prop({ type: Number, reflect: true, defaultValue: 1 }) count!: number;
	@state draft = 'ready';
	@query({ ref: 'action' }) actionButton!: HTMLButtonElement;
	@query({ ref: 'status' }) statusNode!: HTMLSpanElement;
	@query({ ref: 'detail' }) detailNode!: HTMLParagraphElement;

	override connectedCallback(): void {
		super.connectedCallback();
		this.renderTemplate({ target: this, template: counterTemplate(this.count, this.draft) });
	}

	@onEvent({ ref: 'action', type: 'click' })
	handleAction(): void {
		this.count += 1;
		this.draft = `draft-${this.count}`;
	}

	@onUpdated(['count', 'draft'])
	syncView(): void {
		this.renderTemplate({ target: this, template: counterTemplate(this.count, this.draft) });
	}
}

customElements.define('parity-decorator-counter-element', DecoratorCounterParityElement);

class PlainCounterParityElement extends RadiantElement {
	declare count: number;
	declare draft: string;

	private readonly actionQuery = createQuery<HTMLButtonElement>(this, { ref: 'action' });
	private readonly statusQuery = createQuery<HTMLSpanElement>(this, { ref: 'status' });
	private readonly detailQuery = createQuery<HTMLParagraphElement>(this, { ref: 'detail' });

	constructor() {
		super();
		this.createReactiveProp('count', { type: Number, reflect: true, defaultValue: 1 });
		this.createReactiveField('draft', 'ready');
		createEventListener(this, { ref: 'action', type: 'click' }, () => {
			this.count += 1;
			this.draft = `draft-${this.count}`;
		});
	}

	get actionButton(): HTMLButtonElement | null {
		return this.actionQuery.value;
	}

	get statusNode(): HTMLSpanElement | null {
		return this.statusQuery.value;
	}

	get detailNode(): HTMLParagraphElement | null {
		return this.detailQuery.value;
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this.renderTemplate({ target: this, template: counterTemplate(this.count, this.draft) });
		this.registerUpdateCallback('count', () => this.syncView());
		this.registerUpdateCallback('draft', () => this.syncView());
	}

	private syncView(): void {
		this.renderTemplate({ target: this, template: counterTemplate(this.count, this.draft) });
	}
}

customElements.define('parity-plain-counter-element', PlainCounterParityElement);

const counterVariants = [
	{
		label: 'decorators',
		create: () => document.createElement('parity-decorator-counter-element') as CounterElementContract,
	},
	{
		label: 'plain-js',
		create: () => document.createElement('parity-plain-counter-element') as CounterElementContract,
	},
] as const;

type EventEmitterContract = RadiantElement & {
	messageEvent: EventEmitter<{ value: string }>;
	emitMessage: (value: string) => void;
};

type EventListenerContract = RadiantElement & {
	lastMessage: string;
	outputNode: HTMLDivElement | null;
};

type EventHarness = {
	emitter: EventEmitterContract;
	listener: EventListenerContract;
};

class DecoratorEventEmitterParityElement extends RadiantElement {
	@event({ name: 'parity-message', bubbles: true, composed: true })
	messageEvent!: EventEmitter<{ value: string }>;

	emitMessage(value: string): void {
		this.messageEvent.emit({ value });
	}
}

customElements.define('parity-decorator-event-emitter', DecoratorEventEmitterParityElement);

class DecoratorEventListenerParityElement extends RadiantElement {
	lastMessage = 'idle';
	@query({ ref: 'output' }) outputNode!: HTMLDivElement;

	override connectedCallback(): void {
		super.connectedCallback();
		this.renderTemplate({ target: this, template: this.outputTemplate(), insert: 'afterbegin' });
	}

	@onEvent({ selector: 'parity-decorator-event-emitter', type: 'parity-message' })
	handleMessage(event: CustomEvent<{ value: string }>): void {
		this.lastMessage = event.detail.value;
		this.renderTemplate({ target: this.outputNode, template: `Message: ${this.lastMessage}` });
	}

	private outputTemplate(): string {
		return `<div data-ref="output">Message: ${this.lastMessage}</div>`;
	}
}

customElements.define('parity-decorator-event-listener', DecoratorEventListenerParityElement);

class PlainEventEmitterParityElement extends RadiantElement {
	readonly messageEvent: EventEmitter<{ value: string }>;

	constructor() {
		super();
		this.messageEvent = createEvent(this, {
			name: 'parity-message',
			bubbles: true,
			composed: true,
		});
	}

	emitMessage(value: string): void {
		this.messageEvent.emit({ value });
	}
}

customElements.define('parity-plain-event-emitter', PlainEventEmitterParityElement);

class PlainEventListenerParityElement extends RadiantElement {
	lastMessage = 'idle';
	private readonly outputQuery = createQuery<HTMLDivElement>(this, { ref: 'output' });

	constructor() {
		super();
		createEventListener(this, { selector: 'parity-plain-event-emitter', type: 'parity-message' }, (event) => {
			this.lastMessage = (event as CustomEvent<{ value: string }>).detail.value;
			this.renderTemplate({ target: this.outputNode!, template: `Message: ${this.lastMessage}` });
		});
	}

	get outputNode(): HTMLDivElement | null {
		return this.outputQuery.value;
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this.renderTemplate({
			target: this,
			template: `<div data-ref="output">Message: ${this.lastMessage}</div>`,
			insert: 'afterbegin',
		});
	}
}

customElements.define('parity-plain-event-listener', PlainEventListenerParityElement);

const eventVariants = [
	{
		label: 'decorators',
		mount: (): EventHarness => {
			const listener = document.createElement('parity-decorator-event-listener') as EventListenerContract;
			const emitter = document.createElement('parity-decorator-event-emitter') as EventEmitterContract;
			listener.appendChild(emitter);
			document.body.appendChild(listener);
			return { emitter, listener };
		},
	},
	{
		label: 'plain-js',
		mount: (): EventHarness => {
			const listener = document.createElement('parity-plain-event-listener') as EventListenerContract;
			const emitter = document.createElement('parity-plain-event-emitter') as EventEmitterContract;
			listener.appendChild(emitter);
			document.body.appendChild(listener);
			return { emitter, listener };
		},
	},
] as const;

beforeEach(() => {
	document.body.innerHTML = '';
});

describe('decorators vs plain JS parity', () => {
	describe('counter component', () => {
		test.each(counterVariants)('$label renders the same initial reactive output', ({ create }) => {
			const element = create();
			document.body.appendChild(element);

			expect(readCounterSnapshot(element)).toEqual({
				count: 1,
				draft: 'ready',
				attribute: null,
				status: 'Count: 1',
				detail: 'Draft: ready',
			});
		});

		test.each(counterVariants)(
			'$label keeps DOM queries and reflected props aligned after interaction',
			async ({ create }) => {
				const element = create();
				document.body.appendChild(element);

				element.actionButton?.click();

				await waitFor(() => {
					expect(readCounterSnapshot(element)).toEqual({
						count: 2,
						draft: 'draft-2',
						attribute: '2',
						status: 'Count: 2',
						detail: 'Draft: draft-2',
					});
				});

				element.count = 5;
				element.draft = 'manual';

				await waitFor(() => {
					expect(readCounterSnapshot(element)).toEqual({
						count: 5,
						draft: 'manual',
						attribute: '5',
						status: 'Count: 5',
						detail: 'Draft: manual',
					});
				});
			},
		);
	});

	describe('event component pair', () => {
		test.each(eventVariants)('$label delivers the same custom event payloads', ({ mount }) => {
			const { emitter, listener } = mount();

			expect(listener.outputNode?.textContent).toBe('Message: idle');

			emitter.emitMessage('Hello parity');

			expect(listener.outputNode?.textContent).toBe('Message: Hello parity');
			expect(listener.lastMessage).toBe('Hello parity');
		});

		test.each(eventVariants)('$label preserves the emitter instance across reconnects', ({ mount }) => {
			const { emitter } = mount();
			const firstEmitter = emitter.messageEvent;

			emitter.remove();
			document.body.appendChild(emitter);

			expect(emitter.messageEvent).toBe(firstEmitter);
		});
	});
});
