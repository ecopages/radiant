import { describe, expect, test } from 'bun:test';
import { RadiantElement, customElement } from '@/index';

@customElement('my-custom-element')
class MyCustomElement extends RadiantElement {
  override connectedCallback(): void {
    super.connectedCallback();
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
