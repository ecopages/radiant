import { describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { event } from '../../src/decorators/event';
import { onEvent } from '../../src/decorators/on-event';
import type { EventEmitter } from '../../src/tools/event-emitter';

enum RadiantEventEvents {
  CustomEvent = 'custom-event',
}

type RadiantEventDetail = {
  value: string;
};

class RadiantEventEmitter extends RadiantElement {
  @event({ name: RadiantEventEvents.CustomEvent, bubbles: true, composed: true })
  customEvent!: EventEmitter<RadiantEventDetail>;

  @onEvent({ ref: 'emit-button', type: 'click' })
  emitEvent() {
    this.customEvent.emit({ value: 'Hello, World!' });
  }
}

customElements.define('radiant-event-emitter', RadiantEventEmitter);

class RadiantEventListener extends RadiantElement {
  eventDetail!: HTMLDivElement;

  override connectedCallback(): void {
    super.connectedCallback();
    this.eventDetail = this.getRef<HTMLDivElement>('event-detail');
  }

  @onEvent({ selector: 'radiant-event-emitter', type: RadiantEventEvents.CustomEvent })
  updateText(event: CustomEvent<RadiantEventDetail>) {
    this.eventDetail.textContent = event.detail.value;
  }
}

customElements.define('radiant-event-listener', RadiantEventListener);

const createTemplate = () => {
  const radiantEventListener = document.createElement('radiant-event-listener') as RadiantEventListener;
  const divEventDetail = document.createElement('div');
  divEventDetail.setAttribute('data-ref', 'event-detail');
  divEventDetail.textContent = 'Click to change the text';
  const radiantEventEmitter = document.createElement('radiant-event-emitter') as RadiantEventEmitter;
  radiantEventListener.appendChild(divEventDetail);
  radiantEventListener.appendChild(radiantEventEmitter);
  document.body.appendChild(radiantEventListener);
  return { radiantEventListener, radiantEventEmitter };
};

describe('@event', () => {
  test('decorator emits and listens to custom event correctly', async () => {
    const { radiantEventListener, radiantEventEmitter } = createTemplate();
    expect(radiantEventListener.eventDetail.innerHTML).toEqual('Click to change the text');

    radiantEventEmitter.customEvent.emit({ value: 'Hello, World!' });
    expect(radiantEventListener.eventDetail.innerHTML).toEqual('Hello, World!');
  });
});
