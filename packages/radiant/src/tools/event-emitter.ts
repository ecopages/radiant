import type { RadiantElement } from '../core/radiant-element';

export interface EventEmitterConfig {
  name: string;
  bubbles?: boolean;
  cancelable?: boolean;
  composed?: boolean;
}

/**
 * A generic event emitter class that allows emitting custom events.
 *
 * @template T - The type of the event detail.
 */
export class EventEmitter<T = unknown> {
  private host: RadiantElement;
  private eventConfig: EventEmitterConfig;

  /**
   * Constructs a new instance of the EventEmitter class.
   *
   * @param host - The host element on which the events will be dispatched.
   * @param eventConfig - The configuration for the event.
   */
  constructor(host: RadiantElement, eventConfig: EventEmitterConfig) {
    this.host = host;
    this.eventConfig = eventConfig;
  }

  /**
   * Emits a custom event with the specified detail.
   *
   * @param detail - The detail object to be passed along with the event.
   */
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
