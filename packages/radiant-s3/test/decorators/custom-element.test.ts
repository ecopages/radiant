import { describe, expect, test } from 'vitest';
import { customElement } from '../../src/decorators/custom-element';

@customElement('my-custom-element')
class MyCustomElement extends HTMLElement {
  connectedCallback(): void {
    this.innerHTML = 'Hello, world!';
  }
}

describe('@customElement', () => {
  test('decorator register a custom element correctly', () => {
    const customElement = document.createElement('my-custom-element') as MyCustomElement;
    document.body.appendChild(customElement);
    expect(customElement.innerHTML).toEqual('Hello, world!');
  });
});
