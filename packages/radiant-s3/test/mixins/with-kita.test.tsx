import { describe, expect, test } from 'vitest';
import { RadiantElement, type RenderInsertPosition } from '../../src/core/radiant-element';
import { reactiveProp } from '../../src/decorators/reactive-prop';
import { WithKita } from '../../src/mixins/with-kita';

const Message = ({ children, extra }: { children: string; extra: string }) => {
  return (
    <p>
      {children as 'safe'} {extra as 'safe'}
    </p>
  );
};

class MyWithKitaElement extends WithKita(RadiantElement) {
  @reactiveProp({ type: String, defaultValue: 'replace' }) insert: RenderInsertPosition;
  override connectedCallback(): void {
    super.connectedCallback();
    this.renderTemplate({
      target: this,
      template: (
        <div>
          <h1>My Radiant Element</h1>
          <Message extra="World">Hello</Message>
        </div>
      ),
      insert: this.insert,
    });
  }
}

customElements.define('my-with-kita-element', MyWithKitaElement);

describe('WithKita', () => {
  test('it renders template correctly using insert: replace', async () => {
    const element = document.createElement('my-with-kita-element');
    document.body.appendChild(element);
    expect(element.innerHTML).toEqual('<div><h1>My Radiant Element</h1><p>Hello World</p></div>');
  });
  test('it renders template correctly using insert: beforeend', () => {
    const element = document.createElement('my-with-kita-element') as MyWithKitaElement;
    const contents = '<span>existing contents</span>';
    element.innerHTML = contents;
    element.insert = 'beforeend';
    document.body.appendChild(element);
    expect(element.innerHTML).toEqual(`${contents}<div><h1>My Radiant Element</h1><p>Hello World</p></div>`);
  });

  test('it renders template correctly using insert: afterbegin', () => {
    const element = document.createElement('my-with-kita-element') as MyWithKitaElement;
    const contents = '<span>existing contents</span>';
    element.innerHTML = contents;
    element.insert = 'afterbegin';
    document.body.appendChild(element);
    expect(element.innerHTML).toEqual(`<div><h1>My Radiant Element</h1><p>Hello World</p></div>${contents}`);
  });
});
