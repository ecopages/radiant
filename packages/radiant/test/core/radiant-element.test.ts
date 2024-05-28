import { describe, expect, test } from 'bun:test';
import { RadiantElement } from '@/index';

class MyRadiantElement extends RadiantElement {}

customElements.define('my-radiant-element', MyRadiantElement);

describe('RadiantElement', () => {
  test('it renders template correctly', () => {
    document.body.innerHTML = '<my-radiant-element></my-radiant-element>';
    const myElement = document.querySelector('my-radiant-element') as MyRadiantElement;
    const template = '<p>Hello, template!</p>';
    myElement?.renderTemplate({ target: myElement, template, insert: 'replace' });
    expect(myElement.innerHTML).toEqual(template);
  });

  test('it can subscribe to events', () => {
    document.body.innerHTML = '<my-radiant-element></my-radiant-element>';
    const myElement = document.querySelector('my-radiant-element') as MyRadiantElement;
    myElement.subscribeEvents([
      {
        id: 'my-id',
        selector: '[data-ref="click-me"] ',
        type: 'click',
        listener: () => {},
      },
      {
        id: 'my-id-2',
        selector: '[data-ref="click-it"] ',
        type: 'click',
        listener: () => {},
      },
    ]);
    // @ts-expect-error
    expect(myElement.eventSubscriptions.has('my-id')).toBeTruthy();
    // @ts-expect-error
    expect(myElement.eventSubscriptions.has('my-id-2')).toBeTruthy();
  });

  test('it can unsubscribe from events', () => {
    document.body.innerHTML = '<my-radiant-element></my-radiant-element>';
    const myElement = document.querySelector('my-radiant-element') as MyRadiantElement;
    myElement.subscribeEvents([
      {
        id: 'my-id',
        selector: '[data-ref="click-me"] ',
        type: 'click',
        listener: () => {},
      },
      {
        id: 'my-id-2',
        selector: '[data-ref="click-it"] ',
        type: 'click',
        listener: () => {},
      },
    ]);
    myElement.unsubscribeEvent('my-id');
    // @ts-expect-error
    expect(myElement.eventSubscriptions.has('my-id')).toBeFalsy();
    // @ts-expect-error
    expect(myElement.eventSubscriptions.has('my-id-2')).toBeTruthy();
  });
});
