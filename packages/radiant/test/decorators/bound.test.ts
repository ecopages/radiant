import { waitFor } from '@testing-library/dom';
import { describe, expect, test } from 'vitest';
import { bound } from '../../src/decorators/bound';

class MyBoundElement extends HTMLElement {
  nextValue = 'Hello, bound!';
  connectedCallback(): void {
    this.innerHTML = 'Hello, world!';
    this.addEventListener('click', this.handleClick);
  }

  @bound
  handleClick() {
    this.innerHTML = this.nextValue;
  }
}

customElements.define('my-bound-element', MyBoundElement);

describe('@bound', () => {
  test('decorator binds the method correctly', async () => {
    const customElement = document.createElement('my-bound-element') as MyBoundElement;
    document.body.appendChild(customElement);

    customElement.click();
    await waitFor(() => expect(customElement.innerHTML).toEqual('Hello, bound!'));

    const unboundClick = customElement.handleClick;
    unboundClick.call(null);
    await waitFor(() => expect(customElement.innerHTML).toEqual('Hello, bound!'));
  });
});
