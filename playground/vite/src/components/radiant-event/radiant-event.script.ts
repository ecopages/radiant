import { type EventEmitter, RadiantElement, customElement, event, onEvent, query } from '@ecopages/radiant';
import { debounce } from '@ecopages/radiant/decorators/debounce';

enum RadiantEventEvents {
  CustomEvent = 'custom-event',
}

type RadiantEventDetail = {
  value: string;
};

@customElement('radiant-event-emitter')
export class RadiantEventEmitter extends RadiantElement {
  @event({ name: RadiantEventEvents.CustomEvent, bubbles: true, composed: true })
  customEvent!: EventEmitter<RadiantEventDetail>;

  @onEvent({ ref: 'emit-button', type: 'click' })
  onEmitButtonClick() {
    this.customEvent.emit({ value: `Hello World ${new Date().toISOString()}` });
  }
}

@customElement('radiant-event-listener')
export class RadiantEventListener extends RadiantElement {
  @query({ ref: 'event-detail' }) eventDetail!: HTMLDivElement;

  @onEvent({ selector: 'radiant-event-emitter', type: RadiantEventEvents.CustomEvent })
  onCustomEvent(event: CustomEvent<RadiantEventDetail>) {
    this.eventDetail.textContent = event.detail.value;
  }
}

@customElement('radiant-keyboard-keys')
export class RadiantKeyboardKeys extends RadiantElement {
  @query({ selector: 'span' }) key!: HTMLElement;

  @onEvent({ document: true, type: 'keydown' })
  logKeydown(event: KeyboardEvent) {
    this.key.textContent = event.key;
  }
}

@customElement('radiant-sizer')
export class RadiantWindowSizer extends RadiantElement {
  @query({ ref: 'window' }) windowSize!: HTMLElement;
  @query({ ref: 'element' }) elementSize!: HTMLElement;

  connectedCallback(): void {
    super.connectedCallback();
    this.onResize();
  }

  @onEvent({ window: true, type: 'resize' })
  @debounce(200)
  onResize() {
    this.windowSize.textContent = `${window.innerWidth} x ${window.innerHeight}`;
    this.elementSize.textContent = `${this.offsetWidth} x ${this.offsetHeight}`;
  }
}

/**
 * Attaches an external listener for a custom event for demo purposes.
 * Since the component is rendered client-side, the listener is added post-render.
 */
setTimeout(() => {
  (document.querySelector('radiant-event-listener') as RadiantEventEmitter).addEventListener(
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

  namespace JSX {
    interface IntrinsicElements {
      'radiant-event-emitter': HtmlTag;
      'radiant-event-listener': HtmlTag;
      'radiant-keyboard-keys': HtmlTag;
      'radiant-sizer': HtmlTag;
    }
  }
}
