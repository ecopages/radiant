import { type EventEmitter, RadiantElement, customElement, event, onEvent, query } from '@ecopages/radiant';

enum RadiantEventEvents {
  CustomEvent = 'custom-event',
}

type RadiantEventDetail = {
  value: string;
};

@customElement('radiant-event-emitter')
export class RadiantEventEmitter extends RadiantElement {
  @event({ name: RadiantEventEvents.CustomEvent, bubbles: true, composed: true })
  declare customEvent: EventEmitter<RadiantEventDetail>;

  @onEvent({ ref: 'emit-button', type: 'click' })
  onEmitButtonClick() {
    this.customEvent.emit({ value: `Hello World ${new Date().toISOString()}` });
  }
}

@customElement('radiant-event-listener')
export class LiteEventListener extends RadiantElement {
  @query({ ref: 'event-detail' }) eventDetail!: HTMLDivElement;

  @onEvent({ selector: 'radiant-event-emitter', type: RadiantEventEvents.CustomEvent })
  onCustomEvent(event: CustomEvent<RadiantEventDetail>) {
    this.eventDetail.textContent = event.detail.value;
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
    }
  }
}
