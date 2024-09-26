import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { RadiantElement, customElement, onEvent, onUpdated, query, reactiveProp } from '@/index';

@customElement('radiant-counter')
class RadiantCounter extends RadiantElement {
  @reactiveProp({ type: Number, reflect: true }) declare value: number;
  @query({ ref: 'count' }) countText!: HTMLElement;

  @onEvent({ ref: 'decrement', type: 'click' })
  decrement() {
    if (this.value > 0) this.value--;
  }

  @onEvent({ ref: 'increment', type: 'click' })
  increment() {
    this.value++;
  }

  @onUpdated('value')
  updateCount() {
    this.countText.textContent = this.value.toString();
  }
}

const REACTIVE_PROP = 'value';
const COUNT_REF = 'count';
const DECREMENT_REF = 'decrement';
const INCREMENT_REF = 'increment';

const createRadiantCounter = (initialValue?: string) => {
  const customElement = document.createElement('radiant-counter') as RadiantCounter;
  if (initialValue) customElement.setAttribute(REACTIVE_PROP, initialValue);

  const span = document.createElement('span');
  span.setAttribute('data-ref', COUNT_REF);
  customElement.appendChild(span);

  const decrement = document.createElement('button');
  decrement.setAttribute('data-ref', DECREMENT_REF);
  decrement.textContent = 'Decrement';
  customElement.appendChild(decrement);

  const increment = document.createElement('button');
  increment.setAttribute('data-ref', INCREMENT_REF);
  increment.textContent = 'Increment';
  customElement.appendChild(increment);

  return customElement;
};

describe('@onEvent', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('decorator updates the element correctly', () => {
    const customElement = createRadiantCounter('10');
    document.body.appendChild(customElement);

    expect(customElement.value).toEqual(10);
    expect(customElement.countText.innerHTML).toEqual('10');

    const decrement = customElement.querySelector(`[data-ref="${DECREMENT_REF}"]`) as HTMLButtonElement;
    decrement.click();

    expect(customElement.value).toEqual(9);
    expect(customElement.countText.innerHTML).toEqual('9');

    const increment = customElement.querySelector(`[data-ref="${INCREMENT_REF}"]`) as HTMLButtonElement;
    increment.click();

    expect(customElement.value).toEqual(10);
    expect(customElement.countText.innerHTML).toEqual('10');
  });
});
