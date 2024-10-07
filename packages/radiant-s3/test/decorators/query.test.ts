// @vitest-environment happy-dom

import { waitFor } from '@testing-library/dom';
import { wait } from '@testing-library/user-event/dist/types/utils';
import { beforeEach, describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { query } from '../../src/decorators/query';

@customElement('my-query-element')
class MyQueryElement extends RadiantElement {
  @query({ ref: 'my-ref' }) myRef: HTMLDivElement;
  @query({ ref: 'my-ref', all: true, cache: false }) myRefs: HTMLDivElement[];
  @query({ selector: '.my-class' }) myClass: HTMLElement;
  @query({ selector: '.my-class', all: true }) myClasses: HTMLElement[];

  addElement() {
    const div = document.createElement('div');
    div.textContent = `My Ref ${this.myRefs.length + 1}`;
    div.setAttribute('data-ref', 'my-ref');
    this.appendChild(div);
  }
}

const createElementWithRef = (text: string, dataRef: string) => {
  const div = document.createElement('div');
  div.textContent = text;
  div.setAttribute('data-ref', dataRef);
  return div;
};

const createElementWithClass = (text: string, className: string) => {
  const div = document.createElement('div');
  div.textContent = text;
  div.classList.add(className);
  return div;
};

const createTemplate = () => {
  const customElement = document.createElement('my-query-element');

  const innerElementsMap: (
    | {
        text: string;
        dataRef: string;
      }
    | {
        text: string;
        className: string;
      }
  )[] = [
    {
      text: 'My Ref 1',
      dataRef: 'my-ref',
    },
    {
      text: 'My Ref 2',
      dataRef: 'my-ref',
    },
    {
      text: 'My Class 1',
      className: 'my-class',
    },
    {
      text: 'My Class 2',
      className: 'my-class',
    },
    {
      text: 'My Class 3',
      className: 'my-class',
    },
  ];

  for (const innerElement of innerElementsMap) {
    if ('dataRef' in innerElement) {
      customElement.appendChild(createElementWithRef(innerElement.text, innerElement.dataRef));
    } else {
      customElement.appendChild(createElementWithClass(innerElement.text, innerElement.className));
    }
  }

  return customElement as MyQueryElement;
};

describe('@query', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  test('decorator queries ref correctly', async () => {
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
