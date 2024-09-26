import { beforeEach, describe, expect, test } from 'bun:test';
import { RadiantElement } from '@/index';

class MyRadiantElement extends RadiantElement {}

customElements.define('my-radiant-element', MyRadiantElement);

describe('RadiantElement', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('it renders template correctly', () => {
    const customElement = document.createElement('my-radiant-element') as MyRadiantElement;
    document.body.appendChild(customElement);
    const template = '<p>Hello, template!</p>';
    customElement.renderTemplate({ target: customElement, template, insert: 'replace' });
    expect(customElement.innerHTML).toEqual(template);
  });

  test('it can subscribe to events', () => {
    const customElement = document.createElement('my-radiant-element') as MyRadiantElement;
    document.body.appendChild(customElement);
    customElement.subscribeEvents([
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
    // @ts-expect-error: private property
    expect(customElement.eventSubscriptions.has('my-id')).toBeTruthy();
    // @ts-expect-error: private property
    expect(customElement.eventSubscriptions.has('my-id-2')).toBeTruthy();
  });

  test('it can unsubscribe from events', () => {
    const customElement = document.createElement('my-radiant-element') as MyRadiantElement;
    document.body.appendChild(customElement);
    customElement.subscribeEvents([
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
    customElement.unsubscribeEvent('my-id');
    // @ts-expect-error: private property
    expect(customElement.eventSubscriptions.has('my-id')).toBeFalsy();
    // @ts-expect-error: private property
    expect(customElement.eventSubscriptions.has('my-id-2')).toBeTruthy();
  });
});
