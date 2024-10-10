import { describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { bound } from '../../src/decorators/bound';
import { customElement } from '../../src/decorators/custom-element';
import { onUpdated } from '../../src/decorators/on-updated';
import { reactiveField } from '../../src/decorators/reactive-field';

@customElement('my-reactive-field')
class MyReactiveField extends RadiantElement {
  @reactiveField numberOfClicks = 1;

  addClick() {
    this.numberOfClicks++;
  }

  @onUpdated('numberOfClicks')
  updateClicks() {
    this.innerHTML = this.numberOfClicks.toString();
  }
}

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
