import { beforeEach, describe, expect, test } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { prop } from '../../src/decorators/prop';

type ElementConstructorWithObservedAttributes = CustomElementConstructor & {
	observedAttributes?: string[];
};

function observedAttributesOf(constructor: CustomElementConstructor): string[] {
	return (constructor as ElementConstructorWithObservedAttributes).observedAttributes ?? [];
}

describe('@prop', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	describe('string', () => {
		@customElement('my-reactive-string')
		class MyReactiveString extends RadiantElement {
			@prop({ type: String, defaultValue: 'Frank' }) name: string;

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
			@prop({ type: Number }) num: number;

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
			@prop({ type: Boolean, defaultValue: false }) bool: boolean;

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

		test('decorator reads an explicit false attribute value as false on connect', () => {
			const customElement = document.createElement('my-reactive-boolean') as MyReactiveBoolean;
			customElement.setAttribute('bool', 'false');
			document.body.appendChild(customElement);

			expect(customElement.bool).toEqual(false);
		});

		test('reflecting false removes the attribute and keeps the property false', () => {
			@customElement('my-reactive-boolean-reflect')
			class MyReactiveBooleanReflect extends RadiantElement {
				@prop({ type: Boolean, reflect: true, defaultValue: false }) open: boolean;
			}

			expect(observedAttributesOf(MyReactiveBooleanReflect)).toContain('open');

			const el = document.createElement('my-reactive-boolean-reflect') as MyReactiveBooleanReflect;
			document.body.appendChild(el);

			el.open = true;
			expect(el.open).toEqual(true);
			expect(el.hasAttribute('open')).toBe(true);

			el.open = false;
			expect(el.open).toEqual(false);
			expect(el.hasAttribute('open')).toBe(false);
			expect(String(el.open)).toEqual('false');
		});

		test('removing a reflected boolean attribute via DOM sets the property to false', () => {
			@customElement('my-reactive-boolean-attr-remove')
			class MyReactiveBooleanAttrRemove extends RadiantElement {
				@prop({ type: Boolean, reflect: true, defaultValue: false }) open: boolean;
			}

			const el = document.createElement('my-reactive-boolean-attr-remove') as MyReactiveBooleanAttrRemove;
			document.body.appendChild(el);

			el.open = true;
			expect(el.open).toEqual(true);

			el.removeAttribute('open');
			expect(el.open).toEqual(false);
			expect(String(el.open)).toEqual('false');
		});

		test('setting a reflected boolean attribute via DOM sets the property to true', () => {
			@customElement('my-reactive-boolean-attr-set')
			class MyReactiveBooleanAttrSet extends RadiantElement {
				@prop({ type: Boolean, reflect: true, defaultValue: false }) open: boolean;
			}

			const el = document.createElement('my-reactive-boolean-attr-set') as MyReactiveBooleanAttrSet;
			document.body.appendChild(el);

			el.setAttribute('open', '');
			expect(el.open).toEqual(true);
		});
	});

	describe('observedAttributes and attribute channel', () => {
		test('registers every @prop attribute on observedAttributes without a manual static list', () => {
			@customElement('my-reactive-observed-props')
			class MyReactiveObservedProps extends RadiantElement {
				@prop({ type: Number, reflect: true, defaultValue: 0 }) count: number;
				@prop({ type: String, defaultValue: '' }) label: string;
			}

			const observed = observedAttributesOf(MyReactiveObservedProps);
			expect(observed).toContain('count');
			expect(observed).toContain('label');
		});

		test('merges @prop attributes with an existing static observedAttributes list', () => {
			@customElement('my-reactive-observed-merge')
			class MyReactiveObservedMerge extends RadiantElement {
				static observedAttributes = ['data-tracked'];

				@prop({ type: Boolean, defaultValue: false }) enabled: boolean;
			}

			const observed = observedAttributesOf(MyReactiveObservedMerge);
			expect(observed).toContain('data-tracked');
			expect(observed).toContain('enabled');
		});

		test('syncs a custom attribute name to the property after upgrade via setAttribute', () => {
			@customElement('my-reactive-custom-attr')
			class MyReactiveCustomAttr extends RadiantElement {
				@prop({ type: Number, attribute: 'data-count', reflect: true, defaultValue: 0 }) count: number;
			}

			expect(observedAttributesOf(MyReactiveCustomAttr)).toContain('data-count');

			const el = document.createElement('my-reactive-custom-attr') as MyReactiveCustomAttr;
			document.body.appendChild(el);

			el.setAttribute('data-count', '12');
			expect(el.count).toEqual(12);
			expect(el.getAttribute('data-count')).toEqual('12');
		});

		test('does not leak subclass @prop metadata into the base observedAttributes list', () => {
			@customElement('my-reactive-prop-base')
			class MyReactivePropBase extends RadiantElement {
				@prop({ type: Number, defaultValue: 0 }) count: number;
			}

			const baseObservedBefore = [...observedAttributesOf(MyReactivePropBase)];

			@customElement('my-reactive-prop-child')
			class MyReactivePropChild extends MyReactivePropBase {
				@prop({ type: String, defaultValue: '' }) label: string;
			}

			expect(observedAttributesOf(MyReactivePropBase)).toEqual(baseObservedBefore);
			expect(observedAttributesOf(MyReactivePropBase)).toContain('count');
			expect(observedAttributesOf(MyReactivePropBase)).not.toContain('label');

			const childObserved = observedAttributesOf(MyReactivePropChild);
			expect(childObserved).toContain('count');
			expect(childObserved).toContain('label');
		});
	});

	describe('object', () => {
		@customElement('my-reactive-object')
		class MyReactiveObject extends RadiantElement {
			@prop({ type: Object, defaultValue: { name: 'Frank' } }) obj: { name: string };

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
			@prop({ type: Array, defaultValue: ['Frank'] }) names: string[];

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
			@prop({ type: Number, reflect: true, defaultValue: 5 }) value: number;

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
			@prop({ type: Number, reflect: false, defaultValue: 5 }) value: number;

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

	describe('@prop alias', () => {
		@customElement('my-prop-alias-element')
		class MyPropAliasElement extends RadiantElement {
			@prop({ type: Number, reflect: true, defaultValue: 2 }) count: number;
		}

		test('alias exposes the same reactive behavior without implicit binding on RadiantElement', () => {
			const customElement = document.createElement('my-prop-alias-element') as MyPropAliasElement;
			document.body.appendChild(customElement);

			expect(customElement.count).toEqual(2);
			expect(Object.prototype.hasOwnProperty.call(customElement, '$count')).toBe(false);

			customElement.count = 7;

			expect(customElement.count).toEqual(7);
			expect(customElement.getAttribute('count')).toEqual('7');
		});
	});

	describe('@prop on RadiantElement', () => {
		@customElement('my-component-prop-element')
		class MyComponentPropElement extends RadiantElement {
			@prop({ type: Number, reflect: true, defaultValue: 3 }) count: number;
			@prop({ type: Number, defaultValue: 9, bind: false }) silent: number;
		}

		test('alias enables a bound companion accessor by default', () => {
			const customElement = document.createElement('my-component-prop-element') as MyComponentPropElement;
			document.body.appendChild(customElement);

			expect(customElement.count).toEqual(3);
			expect(
				(
					customElement as MyComponentPropElement & { $count: ReturnType<MyComponentPropElement['bind']> }
				).$count.getValue(),
			).toEqual(3);
			expect(Object.prototype.hasOwnProperty.call(customElement, '$silent')).toBe(false);

			customElement.count = 8;

			expect(customElement.count).toEqual(8);
			expect(customElement.getAttribute('count')).toEqual('8');
			expect(
				(
					customElement as MyComponentPropElement & { $count: ReturnType<MyComponentPropElement['bind']> }
				).$count.getValue(),
			).toEqual(8);
		});
	});

	describe('field initializers', () => {
		@customElement('my-inferred-reactive-prop')
		class MyInferredReactiveProp extends RadiantElement {
			@prop({ type: Number, reflect: true }) count = 4;
			@prop({ type: String }) label = 'Hello Radiant';
			@prop({ type: Boolean }) enabled = false;
		}

		test('uses the field initializer as the reactive default when no decorator default is provided', async () => {
			const customElement = document.createElement('my-inferred-reactive-prop') as MyInferredReactiveProp;
			document.body.appendChild(customElement);

			await Promise.resolve();

			expect(customElement.count).toEqual(4);
			expect(customElement.label).toEqual('Hello Radiant');
			expect(customElement.enabled).toEqual(false);
			expect(customElement.getAttribute('count')).toEqual('4');
			expect(
				(
					customElement as MyInferredReactiveProp & { $count: ReturnType<MyInferredReactiveProp['bind']> }
				).$count.getValue(),
			).toEqual(4);
			expect(
				(
					customElement as MyInferredReactiveProp & { $label: ReturnType<MyInferredReactiveProp['bind']> }
				).$label.getValue(),
			).toEqual('Hello Radiant');
			expect(
				(
					customElement as MyInferredReactiveProp & { $enabled: ReturnType<MyInferredReactiveProp['bind']> }
				).$enabled.getValue(),
			).toEqual(false);
		});

		@customElement('my-inferred-reactive-prop-with-explicit-default')
		class MyInferredReactivePropWithExplicitDefault extends RadiantElement {
			@prop({ type: Number, defaultValue: 9 }) count = 4;
		}

		test('keeps the decorator default value authoritative when one is provided', () => {
			const customElement = document.createElement(
				'my-inferred-reactive-prop-with-explicit-default',
			) as MyInferredReactivePropWithExplicitDefault;
			document.body.appendChild(customElement);

			expect(customElement.count).toEqual(9);
		});
	});
});
