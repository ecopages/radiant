import { beforeEach, describe, expect, test } from 'bun:test';
import { RadiantElement, customElement, query } from '@/index';

@customElement('my-query-element')
class MyQueryElement extends RadiantElement {
  @query({ ref: 'my-ref' }) myRef!: HTMLDivElement;
  @query({ ref: 'my-ref', all: true, cache: false }) myRefs!: HTMLDivElement[];
  @query({ selector: '.my-class' }) declare myClass: HTMLElement;
  @query({ selector: '.my-class', all: true }) declare myClasses: HTMLElement[];

  addElement() {
    const div = document.createElement('div');
    div.textContent = `My Ref ${this.myRefs.length + 1}`;
    div.setAttribute('data-ref', 'my-ref');
    this.appendChild(div);
  }
}

const createTemplate = () => {
  const customElement = document.createElement('my-query-element');
  customElement.innerHTML = `
    <div data-ref="my-ref">My Ref 1</div>
    <div data-ref="my-ref">My Ref 2</div>
    <div class="my-class">My Class 1</div>
    <div class="my-class">My Class 2</div>
    <div class="my-class">My Class 3</div>
  `;
  return customElement as MyQueryElement;
};

describe('@query', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('decorator queries ref correctly', () => {
    const customElement = createTemplate();
    document.body.appendChild(customElement);
    expect(customElement.myRef.textContent).toEqual('My Ref 1');
  });

  test('decorator queries all refs correctly', () => {
    const customElement = createTemplate();
    document.body.appendChild(customElement);
    expect(customElement.myRefs.length).toEqual(2);
    expect(customElement.myRefs[0].textContent).toEqual('My Ref 1');
    expect(customElement.myRefs[1].textContent).toEqual('My Ref 2');
  });

  test('decorator queries selector correctly', () => {
    const customElement = createTemplate();
    document.body.appendChild(customElement);
    expect(customElement.myClass.textContent).toEqual('My Class 1');
  });

  test('decorator queries all selectors correctly', () => {
    const customElement = createTemplate();
    document.body.appendChild(customElement);
    expect(customElement.myClasses.length).toEqual(3);
    expect(customElement.myClasses[0].textContent).toEqual('My Class 1');
    expect(customElement.myClasses[1].textContent).toEqual('My Class 2');
    expect(customElement.myClasses[2].textContent).toEqual('My Class 3');
  });

  test('decorator queries ref correctly after adding element', () => {
    const customElement = createTemplate();
    document.body.appendChild(customElement);
    expect(customElement.myRefs.length).toEqual(2);
    customElement.addElement();
    expect(customElement.myRefs.length).toEqual(3);
    expect(customElement.myRefs[2].textContent).toEqual('My Ref 3');
  });
});
