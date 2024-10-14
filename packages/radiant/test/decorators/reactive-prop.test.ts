import { beforeEach, describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { reactiveProp } from '../../src/decorators/reactive-prop';

describe('@reactiveProp', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('string', () => {
    @customElement('my-reactive-string')
    class MyReactiveString extends RadiantElement {
      @reactiveProp({ type: String, defaultValue: 'Frank' }) name: string;

      changeName(name: string) {
        this.name = name;
      }
    }

    test('decorator updates the string correctly', () => {
      const customElement = document.createElement('my-reactive-string') as MyReactiveString;
      document.body.appendChild(customElement);
      customElement.changeName('John');
      expect(customElement.name).toEqual('John');
      customElement.changeName('Jane');
      expect(customElement.name).toEqual('Jane');
    });

    test('decorator has the correct default string value', () => {
      const customElement = document.createElement('my-reactive-string') as MyReactiveString;
      document.body.appendChild(customElement);
      expect(customElement.name).toEqual('Frank');
    });
  });

  describe('number', () => {
    @customElement('my-reactive-number')
    class MyReactiveNumber extends RadiantElement {
      @reactiveProp({ type: Number }) num: number;

      add() {
        this.num++;
      }
    }

    test('decorator updates the number correctly', () => {
      const customElement = document.createElement('my-reactive-number') as MyReactiveNumber;
      document.body.appendChild(customElement);
      customElement.num = 1;
      expect(customElement.num).toEqual(1);
      customElement.add();
      expect(customElement.num).toEqual(2);
    });

    test('decorator has the correct default number value', () => {
      const customElement = document.createElement('my-reactive-number') as MyReactiveNumber;
      document.body.appendChild(customElement);
      expect(customElement.num).toEqual(0);
    });
  });

  describe('boolean', () => {
    @customElement('my-reactive-boolean')
    class MyReactiveBoolean extends RadiantElement {
      @reactiveProp({ type: Boolean, defaultValue: false }) bool: boolean;

      toggleBoolean() {
        this.bool = !this.bool;
      }
    }
    test('decorator updates the boolean correctly', () => {
      const customElement = document.createElement('my-reactive-boolean') as MyReactiveBoolean;
      document.body.appendChild(customElement);
      customElement.bool = true;
      expect(customElement.bool).toEqual(true);
      customElement.toggleBoolean();
      expect(customElement.bool).toEqual(false);
    });

    test('decorator has the correct default boolean value', () => {
      const customElement = document.createElement('my-reactive-boolean') as MyReactiveBoolean;
      document.body.appendChild(customElement);
      expect(customElement.bool).toEqual(false);
    });
  });

  describe('object', () => {
    @customElement('my-reactive-object')
    class MyReactiveObject extends RadiantElement {
      @reactiveProp({ type: Object, defaultValue: { name: 'Frank' } }) obj: { name: string };

      changeName(name: string) {
        this.obj.name = name;
      }
    }

    test('decorator updates the object correctly', () => {
      const customElement = document.createElement('my-reactive-object') as MyReactiveObject;
      document.body.appendChild(customElement);
      customElement.obj = { name: 'John' };
      expect(customElement.obj.name).toEqual('John');
      customElement.changeName('Jane');
      expect(customElement.obj.name).toEqual('Jane');
    });

    test('decorator has the correct default object value', () => {
      const customElement = document.createElement('my-reactive-object') as MyReactiveObject;
      document.body.appendChild(customElement);
      expect(customElement.obj.name).toEqual('Frank');
    });
  });

  describe('array', () => {
    @customElement('my-reactive-array')
    class MyReactiveArray extends RadiantElement {
      @reactiveProp({ type: Array, defaultValue: ['Frank'] }) names: string[];

      addName(name: string) {
        this.names.push(name);
      }
    }

    test('decorator updates the array correctly', () => {
      const customElement = document.createElement('my-reactive-array') as MyReactiveArray;
      document.body.appendChild(customElement);
      customElement.names = ['John'];
      expect(customElement.names).toEqual(['John']);
      customElement.addName('Jane');
      expect(customElement.names).toEqual(['John', 'Jane']);
    });

    test('decorator has the correct default array value', () => {
      const customElement = document.createElement('my-reactive-array') as MyReactiveArray;
      document.body.appendChild(customElement);
      expect(customElement.names).toEqual(['Frank']);
    });
  });

  describe('reflect', () => {
    @customElement('my-reactive-reflect')
    class MyReactiveReflect extends RadiantElement {
      @reactiveProp({ type: Number, reflect: true, defaultValue: 5 }) value: number;

      increment() {
        this.value++;
      }
    }

    test('decorator updates the reflect correctly', () => {
      const customElement = document.createElement('my-reactive-reflect') as MyReactiveReflect;
      document.body.appendChild(customElement);
      customElement.value = 1;
      expect(customElement.value).toEqual(1);
      customElement.increment();
      expect(customElement.value).toEqual(2);
      expect(customElement.getAttribute('value')).toEqual('2');
    });

    test('decorator has the correct default reflect value', () => {
      const customElement = document.createElement('my-reactive-reflect') as MyReactiveReflect;
      document.body.appendChild(customElement);
      expect(customElement.value).toEqual(5);
    });
  });

  describe('not reflect', () => {
    @customElement('my-reactive-not-reflect')
    class MyReactiveNotReflect extends RadiantElement {
      @reactiveProp({ type: Number, reflect: false, defaultValue: 5 }) value: number;

      increment() {
        this.value++;
      }
    }

    test('decorator updates the value correctly but does not reflect it to the attribute', () => {
      const customElement = document.createElement('my-reactive-not-reflect') as MyReactiveNotReflect;
      document.body.appendChild(customElement);
      customElement.value = 1;
      expect(customElement.value).toEqual(1);
      customElement.increment();
      expect(customElement.value).toEqual(2);
      expect(customElement.getAttribute('value')).toEqual(null);
    });

    test('decorator do not reflect the value to the attribute by default', () => {
      const customElement = document.createElement('my-reactive-not-reflect') as MyReactiveNotReflect;
      document.body.appendChild(customElement);
      expect(customElement.value).toEqual(5);
      expect(customElement.getAttribute('value')).toEqual(null);
    });
  });
});
