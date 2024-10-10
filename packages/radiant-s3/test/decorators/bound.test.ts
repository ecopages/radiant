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
    console.log('CLICKED', this.nextValue);
    this.innerHTML = this.nextValue;
  }
}

customElements.define('my-bound-element', MyBoundElement);

describe('@bound', () => {
  test('decorator binds the method correctly', async () => {
    const customElement = document.createElement('my-bound-element') as MyBoundElement;
    document.body.appendChild(customElement);

    // Simulate a click event
    customElement.click();
    await waitFor(() => expect(customElement.innerHTML).toEqual('Hello, bound!'));

    // Use handleClick in a different context
    const unboundClick = customElement.handleClick;
    unboundClick.call(null); // This would fail without @bound
    await waitFor(() => expect(customElement.innerHTML).toEqual('Hello, bound!'));
  });
});
