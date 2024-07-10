import { describe, expect, test } from 'bun:test';
import { RadiantElement, customElement, reactiveProp, stringifyAttribute } from '@/index';

@customElement('my-reactive-number')
class MyReactiveNumber extends RadiantElement {
  @reactiveProp({ type: Number }) declare num: number;

  add() {
    this.num++;
  }
}

const numberTemplate = '<my-reactive-number num="1"></my-reactive-number>';
const numberTemplateWithDefaultValue = '<my-reactive-number></my-reactive-number>';

@customElement('my-reactive-object')
class MyReactiveObject extends RadiantElement {
  @reactiveProp({ type: Object, defaultValue: { name: 'Frank' } }) declare data: { name: string };

  changeName(name: string) {
    this.data.name = name;
  }
}

const objectTemplate = `<my-reactive-object data='${stringifyAttribute({ name: 'John' })}'></my-reactive-object>`;
const objectTemplateWithDefaultValue = '<my-reactive-object></my-reactive-object>';

@customElement('my-reactive-boolean')
class MyReactiveBoolean extends RadiantElement {
  @reactiveProp({ type: Boolean, defaultValue: false }) declare bool: boolean;

  toggleBoolean() {
    this.bool = !this.bool;
  }
}

const booleanTemplate = '<my-reactive-boolean bool></my-reactive-boolean>';
const booleanTemplateWithDefaultValue = '<my-reactive-boolean></my-reactive-boolean>';

@customElement('my-reactive-string')
class MyReactiveString extends RadiantElement {
  @reactiveProp({ type: String, defaultValue: 'Frank' }) declare name: string;

  changeName(name: string) {
    this.name = name;
  }
}

const stringTemplate = '<my-reactive-string name="John"></my-reactive-string>';
const stringTemplateWithDefaultValue = '<my-reactive-string></my-reactive-string>';

@customElement('my-reactive-reflect')
class MyReactiveReflect extends RadiantElement {
  @reactiveProp({ type: Number, reflect: true, defaultValue: 5 }) declare count: number;

  increment() {
    this.count++;
  }
}

const reflectTemplate = '<my-reactive-reflect count="1"></my-reactive-reflect>';
const reflectTemplateWithDefaultValue = '<my-reactive-reflect></my-reactive-reflect>';

@customElement('my-reactive-not-reflect')
class MyReactiveNotReflect extends RadiantElement {
  @reactiveProp({ type: Number, reflect: false, defaultValue: 5 }) declare count: number;

  increment() {
    this.count++;
  }
}

const notReflectTemplate = '<my-reactive-not-reflect count="1"></my-reactive-not-reflect>';
const notReflectTemplateWithDefaultValue = '<my-reactive-not-reflect></my-reactive-not-reflect>';

@customElement('my-reactive-array')
class MyReactiveArray extends RadiantElement {
  @reactiveProp({ type: Array, defaultValue: ['Frank'] }) declare names: string[];

  addName(name: string) {
    this.names.push(name);
  }
}

const arrayTemplate = `<my-reactive-array names='${stringifyAttribute(['John'])}'></my-reactive-array>`;
const arrayTemplateWithDefaultValue = '<my-reactive-array></my-reactive-array>';

describe('@reactiveField', () => {
  test('decorator updates the number correctly', () => {
    document.body.innerHTML = numberTemplate;
    const myReactiveField = document.querySelector('my-reactive-number') as MyReactiveNumber;
    expect(myReactiveField.num).toEqual(1);
    myReactiveField.add();
    expect(myReactiveField.num).toEqual(2);
  });

  test('decorator updates the object correctly', () => {
    document.body.innerHTML = objectTemplate;
    const myReactiveObject = document.querySelector('my-reactive-object') as MyReactiveObject;
    expect(myReactiveObject.data.name).toEqual('John');
    myReactiveObject.changeName('Jane');
    expect(myReactiveObject.data.name).toEqual('Jane');
  });

  test('decorator updates the boolean correctly', () => {
    document.body.innerHTML = booleanTemplate;
    const myReactiveBoolean = document.querySelector('my-reactive-boolean') as MyReactiveBoolean;
    expect(myReactiveBoolean.bool).toEqual(true);
    myReactiveBoolean.toggleBoolean();
    expect(myReactiveBoolean.bool).toEqual(false);
  });

  test('decorator updates the string correctly', () => {
    document.body.innerHTML = stringTemplate;
    const myReactiveString = document.querySelector('my-reactive-string') as MyReactiveString;
    expect(myReactiveString.name).toEqual('John');
    myReactiveString.changeName('Jane');
    expect(myReactiveString.name).toEqual('Jane');
  });

  test('decorator updates the reflect correctly', () => {
    document.body.innerHTML = reflectTemplate;
    const myReactiveReflect = document.querySelector('my-reactive-reflect') as MyReactiveReflect;
    expect(myReactiveReflect.count).toEqual(1);
    myReactiveReflect.increment();
    expect(myReactiveReflect.count).toEqual(2);
    expect(myReactiveReflect.getAttribute('count')).toEqual('2');
  });

  test('decorator updates the not reflect correctly', () => {
    document.body.innerHTML = notReflectTemplate;
    const myReactiveNotReflect = document.querySelector('my-reactive-not-reflect') as MyReactiveNotReflect;
    expect(myReactiveNotReflect.count).toEqual(1);
    myReactiveNotReflect.increment();
    expect(myReactiveNotReflect.count).toEqual(2);
    expect(myReactiveNotReflect.getAttribute('count')).toEqual('1');
  });

  test('decorator updates the array correctly', () => {
    document.body.innerHTML = arrayTemplate;
    const myReactiveArray = document.querySelector('my-reactive-array') as MyReactiveArray;
    expect(myReactiveArray.names).toEqual(['John']);
    myReactiveArray.addName('Jane');
    expect(myReactiveArray.names).toEqual(['John', 'Jane']);
  });

  test('decorator has the correct default number value', () => {
    document.body.innerHTML = numberTemplateWithDefaultValue;
    const myReactiveField = document.querySelector('my-reactive-number') as MyReactiveNumber;
    expect(myReactiveField.num).toEqual(0);
  });

  test('decorator has the correct default object value', () => {
    document.body.innerHTML = objectTemplateWithDefaultValue;
    const myReactiveObject = document.querySelector('my-reactive-object') as MyReactiveObject;
    console.log(myReactiveObject.data);
    expect(myReactiveObject.data.name).toEqual('Frank');
  });

  test('decorator has the correct default boolean value', () => {
    document.body.innerHTML = booleanTemplateWithDefaultValue;
    const myReactiveBoolean = document.querySelector('my-reactive-boolean') as MyReactiveBoolean;
    expect(myReactiveBoolean.bool).toEqual(false);
  });

  test('decorator has the correct default string value', () => {
    document.body.innerHTML = stringTemplateWithDefaultValue;
    const myReactiveString = document.querySelector('my-reactive-string') as MyReactiveString;
    expect(myReactiveString.name).toEqual('Frank');
  });

  test('decorator has the correct default reflect value', () => {
    document.body.innerHTML = reflectTemplateWithDefaultValue;
    const myReactiveReflect = document.querySelector('my-reactive-reflect') as MyReactiveReflect;
    expect(myReactiveReflect.count).toEqual(5);
  });

  test('decorator has the correct default not reflect value', () => {
    document.body.innerHTML = notReflectTemplateWithDefaultValue;
    const myReactiveNotReflect = document.querySelector('my-reactive-not-reflect') as MyReactiveNotReflect;
    expect(myReactiveNotReflect.count).toEqual(5);
  });

  test('decorator has the correct default array value', () => {
    document.body.innerHTML = arrayTemplateWithDefaultValue;
    const myReactiveArray = document.querySelector('my-reactive-array') as MyReactiveArray;
    expect(myReactiveArray.names).toEqual(['Frank']);
  });
});
