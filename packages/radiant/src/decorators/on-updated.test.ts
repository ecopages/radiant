import { describe, expect, test } from 'bun:test';
import { RadiantElement } from '@/core/radiant-element';
import { customElement } from '@/decorators/custom-element';
import { onUpdated } from '@/decorators/on-updated';
import { query } from '@/decorators/query';
import { reactiveProp } from '@/decorators/reactive-prop';

@customElement('radiant-counter')
class RadiantCounter extends RadiantElement {
  @reactiveProp({ type: Number, reflect: true }) declare count: number;
  @query({ ref: 'count' }) countText!: HTMLElement;

  decrement() {
    if (this.count > 0) this.count--;
  }

  increment() {
    this.count++;
  }

  @onUpdated('count')
  updateCount() {
    this.countText.textContent = this.count.toString();
  }
}

const template = `
<radiant-counter count="5">
  <button type="button" data-ref="decrement" aria-label="Decrement">
    -
  </button>
  <span data-ref="count">5</span>
  <button type="button" data-ref="increment" aria-label="Increment">
    +
  </button>
</radiant-counter>`;

describe('@onUpdated', () => {
  test('decorator updates the element correctly', () => {
    document.body.innerHTML = template;
    const radiantEventListener = document.querySelector('radiant-counter') as RadiantCounter;
    expect(radiantEventListener.countText.innerHTML).toEqual('5');
    radiantEventListener.increment();
    expect(radiantEventListener.countText.innerHTML).toEqual('6');
    radiantEventListener.decrement();
    expect(radiantEventListener.countText.innerHTML).toEqual('5');
  });
});
