import type { RadiantElement } from '..';

export interface EventEmitterConfig {
  name: string;
  bubbles?: boolean;
  cancelable?: boolean;
  composed?: boolean;
}

export class EventEmitter<T = unknown> {
  private host: RadiantElement;
  private eventConfig: EventEmitterConfig;

  constructor(host: RadiantElement, eventConfig: EventEmitterConfig) {
    this.host = host;
    this.eventConfig = eventConfig;
  }

  emit(detail?: T) {
    const event = new CustomEvent(this.eventConfig.name, {
      detail: detail,
      bubbles: this.eventConfig.bubbles,
      cancelable: this.eventConfig.cancelable,
      composed: this.eventConfig.composed,
    });
    this.host.dispatchEvent(event);
  }
}
