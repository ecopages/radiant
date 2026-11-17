import { afterEach, describe, expect, test, vi } from 'vitest';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { controller } from '../../src/decorators/controller';
import { customElement } from '../../src/decorators/custom-element';
import { onUpdated } from '../../src/decorators/on-updated';
import { prop } from '../../src/decorators/prop';

declare const __LEGACY_ENVIRONMENT__: boolean;

type Held = HTMLElement & { label?: string };

afterEach(() => {
	document.body.innerHTML = '';
	vi.restoreAllMocks();
});

function hostHolding(value?: string): Held {
	const host = document.createElement('div') as Held;

	if (value !== undefined) {
		host.label = value;
	}

	return host;
}

describe('Element Host: where a prop value comes from', () => {
	@customElement('prec-element-initializer')
	class InitializerElement extends RadiantElement {
		@prop({ type: String }) label = 'initializer';
	}

	@customElement('prec-element-equal')
	class EqualElement extends RadiantElement {
		@prop({ type: String, defaultValue: 'same' }) label = 'same';
	}

	@customElement('prec-element-default')
	class DefaultElement extends RadiantElement {
		@prop({ type: String, defaultValue: 'default' }) label = 'initializer';
	}

	@customElement('prec-element-written')
	class WrittenElement extends RadiantElement {
		@prop({ type: String, defaultValue: 'default' }) label = 'initializer';
	}

	@customElement('prec-element-no-default')
	class NoDefaultElement extends RadiantElement {
		@prop({ type: String }) label = 'initializer';
	}

	test('an initializer with no defaultValue is the value', async () => {
		const element = new InitializerElement();
		document.body.append(element);
		await Promise.resolve();

		expect(element.label).toBe('initializer');
	});

	test('an initializer equal to the defaultValue is the value', async () => {
		const element = new EqualElement();
		document.body.append(element);
		await Promise.resolve();

		expect(element.label).toBe('same');
	});

	test('a defaultValue wins over a differing initializer', async () => {
		const element = new DefaultElement();
		document.body.append(element);
		await Promise.resolve();

		expect(element.label).toBe('default');
	});

	test('an authored attribute wins over the initializer and the defaultValue', async () => {
		const element = new DefaultElement();
		element.setAttribute('label', 'attribute');
		document.body.append(element);
		await Promise.resolve();

		expect(element.label).toBe('attribute');
	});

	test('a write after construction wins over an authored attribute', async () => {
		const element = new WrittenElement();
		element.setAttribute('label', 'attribute');
		element.label = 'written';
		document.body.append(element);
		await Promise.resolve();

		expect(element.label).toBe('written');
	});

	test('a write equal to the defaultValue wins over an authored attribute', async () => {
		const element = new WrittenElement();
		element.setAttribute('label', 'attribute');
		element.label = 'default';
		document.body.append(element);
		await Promise.resolve();

		expect(element.label).toBe('default');
	});

	test('a write on a prop with no defaultValue wins over an authored attribute', async () => {
		const element = new NoDefaultElement();
		element.setAttribute('label', 'attribute');
		element.label = 'written';
		document.body.append(element);
		await Promise.resolve();

		expect(element.label).toBe('written');
	});
});

describe('Controller Host: where a prop value comes from', () => {
	@controller('prec-controller-initializer')
	class InitializerController extends RadiantController {
		@prop({ type: String }) label = 'initializer';
	}

	@controller('prec-controller-equal')
	class EqualController extends RadiantController {
		@prop({ type: String, defaultValue: 'same' }) label = 'same';
	}

	@controller('prec-controller-default')
	class DefaultController extends RadiantController {
		@prop({ type: String, defaultValue: 'default' }) label = 'initializer';
	}

	@controller('prec-controller-no-initializer')
	class BareController extends RadiantController {
		@prop({ type: String, defaultValue: 'default' }) label!: string;
	}

	@controller('prec-controller-no-default')
	class NoDefaultController extends RadiantController {
		@prop({ type: String }) label = 'initializer';
	}

	test('an initializer with no defaultValue is the value', () => {
		const instance = new InitializerController(hostHolding());
		instance.connect();

		expect(instance.label).toBe('initializer');
		instance.disconnect();
	});

	test('an initializer equal to the defaultValue is the value', () => {
		const instance = new EqualController(hostHolding());
		instance.connect();

		expect(instance.label).toBe('same');
		instance.disconnect();
	});

	test('a defaultValue wins over a differing initializer', () => {
		const instance = new DefaultController(hostHolding());
		instance.connect();

		expect(instance.label).toBe('default');
		instance.disconnect();
	});

	test('a value the host held wins over the initializer and the defaultValue', () => {
		const withDefault = new DefaultController(hostHolding('held'));
		withDefault.connect();
		const withoutDefault = new NoDefaultController(hostHolding('held'));
		withoutDefault.connect();

		expect(withDefault.label).toBe('held');
		expect(withoutDefault.label).toBe('held');
		withDefault.disconnect();
		withoutDefault.disconnect();
	});

	test('a value the host held wins over the defaultValue of a field with no initializer', () => {
		const instance = new BareController(hostHolding('held'));
		instance.connect();

		expect(instance.label).toBe('held');
		instance.disconnect();
	});

	test('a write after construction wins over a value the host held', () => {
		const instance = new DefaultController(hostHolding('held'));
		instance.label = 'written';
		instance.connect();

		expect(instance.label).toBe('written');
		expect((instance.host as Held).label).toBe('written');
		instance.disconnect();
	});

	test('a write equal to the defaultValue wins over a value the host held', () => {
		const instance = new DefaultController(hostHolding('held'));
		instance.label = 'default';
		instance.connect();

		expect(instance.label).toBe('default');
		instance.disconnect();
	});

	test('a write on a prop with no defaultValue wins over a value the host held', () => {
		const instance = new NoDefaultController(hostHolding('held'));
		instance.label = 'written';
		instance.connect();

		expect(instance.label).toBe('written');
		instance.disconnect();
	});

	test('a write equal to the initializer wins over a value the host held', () => {
		const instance = new NoDefaultController(hostHolding('held'));
		instance.label = 'initializer';
		instance.connect();

		expect(instance.label).toBe('initializer');
		instance.disconnect();
	});

	test('a write with no host value is the value, reported once', () => {
		const instance = new BareController(hostHolding());
		const seen: string[] = [];
		instance.registerUpdateCallback('label', () => seen.push(instance.label));
		instance.label = 'written';
		instance.connect();

		expect(instance.label).toBe('written');
		expect(seen).toEqual(['written']);
		instance.disconnect();
	});
});

describe.skipIf(!__LEGACY_ENVIRONMENT__)('legacy Controller Host without @controller: any own value at connect', () => {
	class PlainController extends RadiantController {
		@prop({ type: String, defaultValue: 'default' }) label = 'initializer';
	}

	class PlainNoDefaultController extends RadiantController {
		@prop({ type: String }) label = 'initializer';
	}

	test('an initializer wins over the defaultValue', () => {
		const instance = new PlainController(hostHolding());
		instance.connect();

		expect(instance.label).toBe('initializer');
		instance.disconnect();
	});

	test('an initializer wins over a value the host held', () => {
		const instance = new PlainNoDefaultController(hostHolding('held'));
		instance.connect();

		expect(instance.label).toBe('initializer');
		instance.disconnect();
	});

	test('a write wins over the initializer, the defaultValue and a value the host held', () => {
		const instance = new PlainController(hostHolding('held'));
		instance.label = 'written';
		instance.connect();

		expect(instance.label).toBe('written');
		instance.disconnect();
	});

	test('connecting twice keeps the value', () => {
		const instance = new PlainController(hostHolding());
		instance.connect();
		instance.label = 'later';
		instance.disconnect();
		instance.connect();

		expect(instance.label).toBe('later');
		instance.disconnect();
	});
});

describe('the initializer and defaultValue warning', () => {
	const expected = (owner: string) =>
		expect.stringContaining(`"label" on ${owner} has both a field initializer and a different defaultValue`);

	@customElement('prec-warn-element')
	class WarnElement extends RadiantElement {
		@prop({ type: String, defaultValue: 'default' }) label = 'initializer';
	}

	@customElement('prec-warn-element-quiet')
	class QuietElement extends RadiantElement {
		@prop({ type: String, defaultValue: 'same' }) label = 'same';
		@prop({ type: Array, defaultValue: [1] as number[] }) items: number[] = [1];
		@prop({ type: String, defaultValue: 'default' }) bare!: string;
	}

	@controller('prec-warn-controller')
	class WarnController extends RadiantController {
		@prop({ type: String, defaultValue: 'default' }) label = 'initializer';
	}

	@controller('prec-warn-controller-quiet')
	class QuietController extends RadiantController {
		@prop({ type: String, defaultValue: 'same' }) label = 'same';
		@prop({ type: Array, defaultValue: [1] as number[] }) items: number[] = [1];
	}

	test('an Element Host warns once', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		document.body.append(new WarnElement());
		document.body.append(new WarnElement());
		await Promise.resolve();

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith(expected('WarnElement'));
	});

	test('a Controller Host warns', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		new WarnController(hostHolding());

		expect(warn).toHaveBeenCalledWith(expected('WarnController'));
	});

	test('equal values, structurally equal values and an absent initializer do not warn', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		document.body.append(new QuietElement());
		new QuietController(hostHolding());
		await Promise.resolve();

		expect(warn).not.toHaveBeenCalled();
	});
});

describe('a prop with a copying fromProperty that nothing wrote', () => {
	const copy = { fromProperty: (value: unknown) => (Array.isArray(value) ? value.map(String) : []) };

	@controller('prec-copying-controller')
	class CopyingController extends RadiantController {
		@prop({ type: Array, defaultValue: ['a'], transform: copy }) items!: string[];
		changes: string[][] = [];
		reported: string[][] = [];

		@onUpdated('items')
		onItems(changed: ReadonlySet<string>): void {
			this.reported.push([...changed]);
		}

		override updated(changed: ReadonlySet<string>): void {
			this.changes.push([...changed]);
		}
	}

	class PlainCopyingController extends RadiantController {
		@prop({ type: Array, defaultValue: ['a'], transform: copy }) items!: string[];
		reported: string[][] = [];

		@onUpdated('items')
		onItems(changed: ReadonlySet<string>): void {
			this.reported.push([...changed]);
		}
	}

	test('keeps its value and reports nothing on first connect', () => {
		const instance = new CopyingController(hostHolding());
		const before = instance.items;
		instance.connect();

		expect(instance.items).toBe(before);
		expect(instance.reported).toEqual([]);
		expect(instance.changes.flat()).not.toContain('items');
		instance.disconnect();
	});

	test('keeps its value and reports nothing on first connect without @controller', () => {
		const instance = new PlainCopyingController(hostHolding());
		instance.connect();

		expect(instance.items).toEqual(['a']);
		expect(instance.reported).toEqual([]);
		instance.disconnect();
	});
});

describe('the initializer and defaultValue warning names the declaring class', () => {
	class Base extends RadiantElement {
		@prop({ type: String, defaultValue: 'default' }) label = 'initializer';
	}

	@customElement('prec-warn-derived-a')
	class DerivedA extends Base {}

	@customElement('prec-warn-derived-b')
	class DerivedB extends Base {}

	function declareTwin(tag: string) {
		@customElement(tag)
		class Twin extends RadiantElement {
			@prop({ type: String, defaultValue: 'default' }) label = 'initializer';
		}

		return Twin;
	}

	test.skipIf(__LEGACY_ENVIRONMENT__)('names the declaring class once for two subclasses', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		document.body.append(new DerivedA());
		document.body.append(new DerivedB());
		await Promise.resolve();

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('"label" on Base has both'));
	});

	test.skipIf(!__LEGACY_ENVIRONMENT__)(
		'names the constructed class once per class when the initializer sits in the base',
		async () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			document.body.append(new DerivedA());
			document.body.append(new DerivedA());
			document.body.append(new DerivedB());
			await Promise.resolve();

			expect(warn).toHaveBeenCalledTimes(2);
			expect(warn).toHaveBeenCalledWith(expect.stringContaining('"label" on DerivedA has both'));
			expect(warn).toHaveBeenCalledWith(expect.stringContaining('"label" on DerivedB has both'));
		},
	);

	test.skipIf(!__LEGACY_ENVIRONMENT__)(
		'names the subclass whose initializer was ignored, not the base that declares the prop',
		async () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

			@customElement('prec-warn-override-base')
			class OverrideBase extends RadiantElement {
				@prop({ type: String, defaultValue: 'default' }) label!: string;
			}

			@customElement('prec-warn-override-a')
			class OverrideA extends OverrideBase {
				override label = 'x';
			}

			@customElement('prec-warn-override-b')
			class OverrideB extends OverrideBase {
				override label = 'y';
			}

			document.body.append(new OverrideBase());
			document.body.append(new OverrideA());
			document.body.append(new OverrideB());
			await Promise.resolve();

			expect(warn).toHaveBeenCalledTimes(2);
			expect(warn).toHaveBeenCalledWith(expect.stringContaining('"label" on OverrideA has both'));
			expect(warn).toHaveBeenCalledWith(expect.stringContaining('"label" on OverrideB has both'));
		},
	);

	test('warns for each of two unrelated classes that share a name', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const First = declareTwin('prec-warn-twin-a');
		const Second = declareTwin('prec-warn-twin-b');
		document.body.append(new First());
		document.body.append(new Second());
		await Promise.resolve();

		expect(warn).toHaveBeenCalledTimes(2);
	});
});
