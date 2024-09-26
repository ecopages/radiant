import { beforeEach, describe, expect, test } from 'bun:test';
import { RadiantElement, customElement, reactiveProp } from '@/index';

describe('@reactiveProp', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('string', () => {
    @customElement('my-reactive-string')
    class MyReactiveString extends RadiantElement {
      @reactiveProp({ type: String, defaultValue: 'Frank' }) declare name: string;

      changeName(name: string) {
        this.name = name;
      }
    }

    test('decorator updates the string correctly', () => {
      const customElement = document.createElement('my-reactive-string') as MyReactiveString;
      customElement.setAttribute('name', 'John');
      document.body.appendChild(customElement);
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
      @reactiveProp({ type: Number }) declare num: number;

      add() {
        this.num++;
      }
    }

    test('decorator updates the number correctly', () => {
      const customElement = document.createElement('my-reactive-number') as MyReactiveNumber;
      customElement.setAttribute('num', '1');
      document.body.appendChild(customElement);
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
      @reactiveProp({ type: Boolean, defaultValue: false }) declare bool: boolean;

      toggleBoolean() {
        this.bool = !this.bool;
      }
    }
    test('decorator updates the boolean correctly', () => {
      const customElement = document.createElement('my-reactive-boolean') as MyReactiveBoolean;
      customElement.setAttribute('bool', '');
      document.body.appendChild(customElement);
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
      @reactiveProp({ type: Object, defaultValue: { name: 'Frank' } }) declare data: { name: string };

      changeName(name: string) {
        this.data.name = name;
      }
    }

    test('decorator updates the object correctly', () => {
      const customElement = document.createElement('my-reactive-object') as MyReactiveObject;
      customElement.setAttribute('data', JSON.stringify({ name: 'John' }));
      document.body.appendChild(customElement);
      expect(customElement.data.name).toEqual('John');
      customElement.changeName('Jane');
      expect(customElement.data.name).toEqual('Jane');
    });

    test('decorator has the correct default object value', () => {
      const customElement = document.createElement('my-reactive-object') as MyReactiveObject;
      document.body.appendChild(customElement);
      expect(customElement.data.name).toEqual('Frank');
    });
  });

  describe('array', () => {
    @customElement('my-reactive-array')
    class MyReactiveArray extends RadiantElement {
      @reactiveProp({ type: Array, defaultValue: ['Frank'] }) declare names: string[];

      addName(name: string) {
        this.names.push(name);
      }
    }

    test('decorator updates the array correctly', () => {
      const customElement = document.createElement('my-reactive-array') as MyReactiveArray;
      customElement.setAttribute('names', JSON.stringify(['John']));
      document.body.appendChild(customElement);
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
      @reactiveProp({ type: Number, reflect: true, defaultValue: 5 }) declare count: number;

      increment() {
        this.count++;
      }
    }

    test('decorator updates the reflect correctly', () => {
      const customElement = document.createElement('my-reactive-reflect') as MyReactiveReflect;
      customElement.setAttribute('count', '1');
      document.body.appendChild(customElement);
      expect(customElement.count).toEqual(1);
      customElement.increment();
      expect(customElement.count).toEqual(2);
      expect(customElement.getAttribute('count')).toEqual('2');
    });

    test('decorator has the correct default reflect value', () => {
      const customElement = document.createElement('my-reactive-reflect') as MyReactiveReflect;
      document.body.appendChild(customElement);
      expect(customElement.count).toEqual(5);
    });
  });

  describe('not reflect', () => {
    @customElement('my-reactive-not-reflect')
    class MyReactiveNotReflect extends RadiantElement {
      @reactiveProp({ type: Number, reflect: false, defaultValue: 5 }) declare count: number;

      increment() {
        this.count++;
      }
    }

    test('decorator updates the not reflect correctly', () => {
      const customElement = document.createElement('my-reactive-not-reflect') as MyReactiveNotReflect;
      customElement.setAttribute('count', '1');
      document.body.appendChild(customElement);
      expect(customElement.count).toEqual(1);
      customElement.increment();
      expect(customElement.count).toEqual(2);
      expect(customElement.getAttribute('count')).toEqual('1');
    });

    test('decorator has the correct default not reflect value', () => {
      const customElement = document.createElement('my-reactive-not-reflect') as MyReactiveNotReflect;
      document.body.appendChild(customElement);
      expect(customElement.count).toEqual(5);
    });
  });
});
