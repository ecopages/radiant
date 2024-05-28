import { describe, expect, test } from 'bun:test';
import { type EventEmitter, RadiantElement, customElement, event, onEvent, query } from '@/index';

enum RadiantEventEvents {
  CustomEvent = 'custom-event',
}

type RadiantEventDetail = {
  value: string;
};

@customElement('radiant-event-emitter')
class RadiantEventEmitter extends RadiantElement {
  @event({ name: RadiantEventEvents.CustomEvent, bubbles: true, composed: true })
  customEvent!: EventEmitter<RadiantEventDetail>;

  @onEvent({ ref: 'emit-button', type: 'click' })
  onEmitButtonClick() {
    this.customEvent.emit({ value: 'Hello, World!' });
  }
}

@customElement('radiant-event-listener')
class RadiantEventListener extends RadiantElement {
  @query({ ref: 'event-detail' }) eventDetail!: HTMLDivElement;

  @onEvent({ selector: 'radiant-event-emitter', type: RadiantEventEvents.CustomEvent })
  onCustomEvent(event: CustomEvent<RadiantEventDetail>) {
    this.eventDetail.textContent = event.detail.value;
  }
}

const template = `
<radiant-event-listener>
  <div data-ref="event-detail">Click to change the text</div>
  <radiant-event-emitter></radiant-event-emitter>
</radiant-event-listener>`;

describe('@event', () => {
  test('decorator emits and listens to custom event correctly', () => {
    document.body.innerHTML = template;
    const radiantEventListener = document.querySelector('radiant-event-listener') as RadiantEventListener;
    const radiantEventEmitter = document.querySelector('radiant-event-emitter') as RadiantEventEmitter;
    expect(radiantEventListener.eventDetail.innerHTML).toEqual('Click to change the text');
    radiantEventEmitter.customEvent.emit({ value: 'Hello, World!' });
    expect(radiantEventListener.eventDetail.innerHTML).toEqual('Hello, World!');
  });
});
