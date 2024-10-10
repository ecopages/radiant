import { RadiantElement } from '@ecopages/radiant-s3/core/radiant-element';
import { bound } from '@ecopages/radiant-s3/decorators/bound';
import { customElement } from '@ecopages/radiant-s3/decorators/custom-element';
import { onEvent } from '@ecopages/radiant-s3/decorators/on-event';
import { onUpdated } from '@ecopages/radiant-s3/decorators/on-updated';
import { query } from '@ecopages/radiant-s3/decorators/query';
import { reactiveProp } from '@ecopages/radiant-s3/decorators/reactive-prop';

export type RadiantCounterProps = {
  value?: number;
};

@customElement('radiant-counter')
export class RadiantCounter extends RadiantElement {
  @reactiveProp({ type: Number, reflect: true, defaultValue: 0 }) value: number;
  @query({ ref: 'count' }) countText!: HTMLElement;

  @onEvent({ ref: 'decrement', type: 'click' })
  decrement() {
    if (this.value > 0) this.value--;
  }

  @onEvent({ ref: 'increment', type: 'click' })
  increment() {
    this.value++;
  }

  @bound
  @onUpdated('value')
  updateCount() {
    this.countText.textContent = this.value.toString();
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'radiant-counter': HtmlTag & RadiantCounterProps;
    }
  }
}
