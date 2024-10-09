import { waitFor } from '@testing-library/dom';
import { beforeEach, describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { onUpdated } from '../../src/decorators/on-updated';
import { query } from '../../src/decorators/query';
import { reactiveProp } from '../../src/decorators/reactive-prop';

describe('@onUpdated', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  @customElement('radiant-counter')
  class RadiantCounter extends RadiantElement {
    static observedAttributes = ['value'];
    @reactiveProp({ type: Number, defaultValue: 3 }) value: number;
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

  test('decorator updates the element correctly', () => {
    const customElement = createRadiantCounter('5');
    document.body.appendChild(customElement);
    customElement[REACTIVE_PROP] = 10;
    expect(customElement[REACTIVE_PROP]).toEqual(10);
    expect(customElement.countText.innerHTML).toEqual('10');
    customElement[REACTIVE_PROP] = 15;
    expect(customElement[REACTIVE_PROP]).toEqual(15);
    expect(customElement.countText.innerHTML).toEqual('15');
    customElement.decrement();
    expect(customElement[REACTIVE_PROP]).toEqual(14);
    expect(customElement.countText.innerHTML).toEqual('14');
    customElement.increment();
    expect(customElement[REACTIVE_PROP]).toEqual(15);
    expect(customElement.countText.innerHTML).toEqual('15');
  });

  test('decorator updates the element correctly when setAttribute is used and observedAttributes is defined', () => {
    const customElement = createRadiantCounter('5');
    document.body.appendChild(customElement);
    customElement.setAttribute(REACTIVE_PROP, '10');
    expect(customElement.countText.innerHTML).toEqual('10');
  });

  test('decorator updates the value on load if no value is provided', async () => {
    const customElement = createRadiantCounter();
    document.body.appendChild(customElement);
    expect(customElement[REACTIVE_PROP]).toEqual(3);
    await waitFor(() => expect(customElement.countText.innerHTML).toEqual('3'));
  });
});
