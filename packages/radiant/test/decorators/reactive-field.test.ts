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

const template = '<my-reactive-field>1</my-reactive-field>';

describe('@reactiveField', () => {
  test('decorator updates the element correctly', () => {
    document.body.innerHTML = template;
    const myReactiveField = document.querySelector('my-reactive-field') as MyReactiveField;
    expect(myReactiveField.innerHTML).toEqual('1');
    myReactiveField.addClick();
    expect(myReactiveField.innerHTML).toEqual('2');
  });
});
