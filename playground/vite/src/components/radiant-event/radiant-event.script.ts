import type { JSX_PROPS } from '@ecopages/jsx';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { RadiantElement, customElement, event, onEvent, query } from '@ecopages/radiant';
import { debounce } from '@ecopages/radiant/decorators/debounce';

enum RadiantEventEvents {
	CustomEvent = 'custom-event',
}

type RadiantEventDetail = {
	value: string;
};

@customElement('radiant-event-emitter')
export class RadiantEventEmitter extends RadiantElement {
	declare readonly [JSX_PROPS]?: Record<never, never>;
	@event({ name: RadiantEventEvents.CustomEvent, bubbles: true, composed: true })
	customEvent!: EventEmitter<RadiantEventDetail>;

	@onEvent({ ref: 'emit-button', type: 'click' })
	onEmitButtonClick() {
		this.customEvent.emit({ value: `Hello World ${new Date().toISOString()}` });
	}
}

@customElement('radiant-event-listener')
export class RadiantEventListener extends RadiantElement {
	declare readonly [JSX_PROPS]?: Record<never, never>;
	@query({ ref: 'event-detail' }) eventDetail!: HTMLDivElement | null;

	@onEvent({ selector: 'radiant-event-emitter', type: RadiantEventEvents.CustomEvent })
	onCustomEvent(event: CustomEvent<RadiantEventDetail>) {
		if (this.eventDetail) this.eventDetail.textContent = event.detail.value;
	}
}

@customElement('radiant-keyboard-keys')
export class RadiantKeyboardKeys extends RadiantElement {
	declare readonly [JSX_PROPS]?: Record<never, never>;
	@query({ selector: 'span' }) key!: HTMLElement | null;

	@onEvent({ document: true, type: 'keydown' })
	logKeydown(event: KeyboardEvent) {
		if (this.key) this.key.textContent = event.key;
	}
}

@customElement('radiant-sizer')
export class RadiantWindowSizer extends RadiantElement {
	declare readonly [JSX_PROPS]?: Record<never, never>;
	@query({ ref: 'window' }) windowSize!: HTMLElement | null;
	@query({ ref: 'element' }) elementSize!: HTMLElement | null;

	connectedCallback(): void {
		super.connectedCallback();
		this.onResize();
	}

	@onEvent({ window: true, type: 'resize' })
	@debounce(200)
	onResize() {
		if (this.windowSize) this.windowSize.textContent = `${window.innerWidth} x ${window.innerHeight}`;
		if (this.elementSize) this.elementSize.textContent = `${this.offsetWidth} x ${this.offsetHeight}`;
	}
}

/**
 * Attaches an external listener for a custom event for demo purposes.
 * Since the component is rendered client-side, the listener is added post-render.
 */
setTimeout(() => {
	document.querySelector('radiant-event-listener')?.addEventListener(
		RadiantEventEvents.CustomEvent,
		(event: CustomEvent<RadiantEventDetail>) => {
			console.log('External Listener:', event.detail.value);
		},
	);
}, 1500);

declare global {
	interface HTMLElementEventMap {
		[RadiantEventEvents.CustomEvent]: CustomEvent<RadiantEventDetail>;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'radiant-event-emitter': RadiantEventEmitter;
		'radiant-event-listener': RadiantEventListener;
		'radiant-keyboard-keys': RadiantKeyboardKeys;
		'radiant-sizer': RadiantWindowSizer;
	}
}
