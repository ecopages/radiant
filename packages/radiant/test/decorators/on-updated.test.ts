import { beforeEach, describe, expect, test } from 'bun:test';
import { RadiantElement, customElement, onUpdated, query, reactiveProp } from '@/index';

@customElement('radiant-counter')
class RadiantCounter extends RadiantElement {
  @reactiveProp({ type: Number, reflect: true, defaultValue: 3 }) declare value: number;
  @query({ ref: 'count' }) countText!: HTMLElement;

  decrement() {
    if (this.value > 0) this.value--;
  }

  increment() {
    this.value++;
  }

  @onUpdated('value')
  updateCount() {
    this.countText.textContent = this.value.toString();
  }
}

const REACTIVE_PROP = 'value';
const DATA_REF = 'count';

const createRadiantCounter = (initialValue?: string) => {
  const customElement = document.createElement('radiant-counter') as RadiantCounter;
  if (initialValue) customElement.setAttribute(REACTIVE_PROP, initialValue);
  const span = document.createElement('span');
  span.setAttribute('data-ref', DATA_REF);
  if (initialValue) span.innerHTML = initialValue;
  customElement.appendChild(span);
  return customElement;
};

describe('@onUpdated', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('decorator updates the element correctly', () => {
    const customElement = createRadiantCounter('5');
    document.body.appendChild(customElement);
    customElement.value = 10;
    expect(customElement.value).toEqual(10);
    expect(customElement.countText.innerHTML).toEqual('10');
    customElement.setAttribute(REACTIVE_PROP, '15');
    expect(customElement.value).toEqual(15);
    expect(customElement.countText.innerHTML).toEqual('15');
    customElement.decrement();
    expect(customElement.value).toEqual(14);
    expect(customElement.countText.innerHTML).toEqual('14');
    customElement.increment();
    expect(customElement.value).toEqual(15);
    expect(customElement.countText.innerHTML).toEqual('15');
  });

  test('decorator updates the element correctly when setAttribute is used', () => {
    const customElement = createRadiantCounter('5');
    document.body.appendChild(customElement);
    customElement.setAttribute(REACTIVE_PROP, '10');
    expect(customElement.countText.innerHTML).toEqual('10');
  });

  test('decorator updates the value on load if no value is provided', () => {
    const customElement = createRadiantCounter();
    document.body.appendChild(customElement);
    expect(customElement.value).toEqual(3);
    expect(customElement.countText.innerHTML).toEqual('3');
  });
});
