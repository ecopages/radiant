// @vitest-environment happy-dom

import { waitFor } from '@testing-library/dom';
import { beforeEach, describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { onUpdated } from '../../src/decorators/on-updated';
import { query } from '../../src/decorators/query';
import { reactiveProp } from '../../src/decorators/reactive-prop';

@customElement('radiant-counter')
class RadiantCounter extends RadiantElement {
  static observedAttributes = ['value'];
  @reactiveProp({ type: Number, reflect: true, defaultValue: 3 }) value: number;
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

  test('decorator updates the element correctly', async () => {
    const customElement = createRadiantCounter('5');
    document.body.appendChild(customElement);
    customElement.value = 10;

    await waitFor(
      () => {
        expect(customElement.value).toEqual(10);
        expect(customElement.countText.innerHTML).toEqual('10');
      },
      {
        timeout: 100,
      },
    );
  });

  test('decorator updates the element correctly when setAttribute is used', async () => {
    const customElement = createRadiantCounter('5');
    document.body.appendChild(customElement);
    customElement.setAttribute(REACTIVE_PROP, '10');

    await waitFor(
      () => {
        expect(customElement.value).toEqual(10);
        expect(customElement.countText.innerHTML).toEqual('10');
      },
      {
        timeout: 100,
      },
    );
  });

  test('decorator updates the value on load if no value is provided', async () => {
    const customElement = createRadiantCounter();
    document.body.appendChild(customElement);

    await waitFor(
      () => {
        expect(customElement.value).toEqual(3);
        expect(customElement.countText.innerHTML).toEqual('3');
      },
      {
        timeout: 100,
      },
    );
  });
});
