import { describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { reactiveField } from '../../src/decorators/reactive-field';

class MyReactiveField extends RadiantElement {
  @reactiveField numberOfClicks = 1;

  override connectedCallback() {
    super.connectedCallback();
    this.updateClicks = this.updateClicks.bind(this);
    this.registerUpdateCallback('numberOfClicks', this.updateClicks);
  }

  addClick() {
    this.numberOfClicks++;
  }

  updateClicks() {
    this.innerHTML = this.numberOfClicks.toString();
  }
}

customElements.define('my-reactive-field', MyReactiveField);

describe('@reactiveField', () => {
  test('decorator updates the element correctly', () => {
    const customElement = document.createElement('my-reactive-field') as MyReactiveField;
    customElement.innerHTML = '1';
    document.body.appendChild(customElement);
    expect(customElement.innerHTML).toEqual('1');
    customElement.addClick();
    expect(customElement.innerHTML).toEqual('2');
  });
});
