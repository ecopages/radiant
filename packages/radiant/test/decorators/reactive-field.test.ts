import { describe, expect, test } from 'bun:test';
import { RadiantElement, customElement, onUpdated, reactiveField } from '@/index';

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
