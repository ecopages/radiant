import { afterEach, describe, expect, test, vi } from 'vitest';
import { setDevWarningsEnabled } from '@ecopages/jsx/jsx-dev-runtime';
import { state as createSignal, type WritableSignal } from '@ecopages/signals';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { prop } from '../../src/decorators/prop';
import { signal } from '../../src/decorators/signal';
import { state } from '../../src/decorators/state';

class Engine {
	constructor(public readonly name: string) {}
}

let tagCounter = 0;
const nextTag = (kind: string) => `pre-upgrade-${kind}-${++tagCounter}`;

function createUnupgradedHost<V>(tag: string, name: string, value: V, attributes: Record<string, string> = {}) {
	const host = document.createElement(tag) as HTMLElement & Record<string, unknown>;
	for (const [key, attributeValue] of Object.entries(attributes)) {
		host.setAttribute(key, attributeValue);
	}
	host[name] = value;
	document.body.appendChild(host);
	return host;
}

describe('pre-upgrade property assignment', () => {
	afterEach(() => {
		setDevWarningsEnabled(undefined);
		vi.restoreAllMocks();
		document.body.innerHTML = '';
	});

	const objectValue = { id: 1 };
	const instanceValue = new Engine('v8');

	test.each([
		['object', objectValue],
		['class instance', instanceValue],
	])('@prop adopts a %s assigned before upgrade', (_, value) => {
		const tag = nextTag('prop');
		const host = createUnupgradedHost(tag, 'data', value);

		@customElement(tag)
		class Host extends RadiantElement {
			@prop({ type: Object, defaultValue: { id: 0 } }) data: unknown;
		}

		expect((host as unknown as Host).data).toBe(value);
	});

	test.each([
		['object', objectValue],
		['class instance', instanceValue],
	])('@state keeps its initializer and warns once for a %s assigned before upgrade', (_, value) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const tag = nextTag('state');
		const first = createUnupgradedHost(tag, 'data', value);
		const second = createUnupgradedHost(tag, 'data', value);

		@customElement(tag)
		class Host extends RadiantElement {
			@state data: unknown = 'initializer';
		}

		expect((first as unknown as Host).data).toBe('initializer');
		expect((second as unknown as Host).data).toBe('initializer');
		expect(warn).toHaveBeenCalledTimes(1);
		const message = String(warn.mock.calls[0]?.[0]);
		expect(message).toContain('"data"');
		expect(message).toContain('discarded');
		expect(message).toContain('@prop');
	});

	test('@state keeps its initializer over an authored attribute and a pre-upgrade value', () => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		const tag = nextTag('state');
		const host = createUnupgradedHost(tag, 'label', 'prop', { label: 'attr' });

		@customElement(tag)
		class Host extends RadiantElement {
			@state label = 'initializer';
		}

		expect((host as unknown as Host).label).toBe('initializer');
	});

	test.each([
		['plain value', () => objectValue],
		['signal-like source', () => createSignal('from-source')],
	])('@signal keeps its initializer and warns once for a %s assigned before upgrade', (_, makeValue) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const tag = nextTag('signal');
		const host = createUnupgradedHost(tag, 'data', makeValue());

		@customElement(tag)
		class Host extends RadiantElement {
			@signal({ initial: 'initializer' }) data!: WritableSignal<unknown>;
		}

		expect((host as unknown as Host).data.get()).toBe('initializer');
		expect(warn).toHaveBeenCalledTimes(1);
		const message = String(warn.mock.calls[0]?.[0]);
		expect(message).toContain('"data"');
		expect(message).toContain('discarded');
		expect(message).toContain('@prop');
	});

	test('does not warn when the host had no pre-upgrade value', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const tag = nextTag('clean');
		const host = document.createElement(tag);
		document.body.appendChild(host);

		@customElement(tag)
		class Host extends RadiantElement {
			@state count = 1;
			@signal({ initial: 2 }) total!: WritableSignal<number>;
		}

		expect(host).toBeInstanceOf(Host);
		expect(warn).not.toHaveBeenCalled();
	});

	test('stays silent when development warnings are disabled', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		setDevWarningsEnabled(false);
		const tag = nextTag('silent');
		const host = createUnupgradedHost(tag, 'count', 5);
		createUnupgradedHost(tag, 'total', 5);

		@customElement(tag)
		class Host extends RadiantElement {
			@state count = 1;
			@signal({ initial: 2 }) total!: WritableSignal<number>;
		}

		expect(host).toBeInstanceOf(Host);
		expect(warn).not.toHaveBeenCalled();
	});

	describe('class accessors shadowed by a pre-upgrade assignment', () => {
		/**
		 * @remarks
		 * Stands in for a library accessor decorator such as MobX `@observable accessor`. Under standard decorators it
		 * wraps the `accessor` field; under legacy decorators it defines the accessor on the prototype.
		 */
		function observableAccessor(
			target: unknown,
			context: unknown,
		): ClassAccessorDecoratorResult<RadiantElement, unknown> | void {
			if (typeof context === 'string') {
				const store = new WeakMap<object, unknown>();
				Object.defineProperty(target as object, context, {
					configurable: true,
					get(this: object) {
						return store.get(this);
					},
					set(this: object, value: unknown) {
						store.set(this, value);
					},
				});
				return;
			}
			const { get, set } = target as { get: () => unknown; set: (value: unknown) => void };
			return { get, set };
		}

		test('a hand-written accessor warns once', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const tag = nextTag('getset');
			const first = createUnupgradedHost(tag, 'mode', 'b');
			createUnupgradedHost(tag, 'mode', 'c');

			@customElement(tag)
			class Host extends RadiantElement {
				#mode = 'a';
				get mode() {
					return this.#mode;
				}
				set mode(value: string) {
					this.#mode = value;
				}
			}

			expect(first).toBeInstanceOf(Host);
			expect(warn).toHaveBeenCalledTimes(1);
			const message = String(warn.mock.calls[0]?.[0]);
			expect(message).toContain('"mode"');
			expect(message).toContain('shadows the class accessor');
			expect(message).toContain('@prop');
			expect(message).toContain('delete the own property');
			expect(message).not.toContain('re-assign it through the setter');
		});

		test('saving the value, deleting the own property and re-assigning it reaches the accessor', () => {
			vi.spyOn(console, 'warn').mockImplementation(() => {});
			const tag = nextTag('recover');
			const host = createUnupgradedHost(tag, 'mode', 'b');
			const seen: string[] = [];

			@customElement(tag)
			class Host extends RadiantElement {
				#mode = 'a';
				get mode() {
					return this.#mode;
				}
				set mode(value: string) {
					seen.push(value);
					this.#mode = value;
				}
			}

			const upgraded = host as unknown as Host;
			upgraded.mode = 'c';
			expect(seen).toEqual([]);
			expect(upgraded.mode).toBe('c');

			const saved = upgraded.mode;
			delete (upgraded as { mode?: string }).mode;
			expect(upgraded.mode).toBe('a');
			upgraded.mode = saved;

			expect(seen).toEqual(['c']);
			expect(upgraded.mode).toBe('c');
		});

		test('an accessor field warns once', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const tag = nextTag('accessor');
			const host = createUnupgradedHost(tag, 'mode', 'b');

			@customElement(tag)
			class Host extends RadiantElement {
				accessor mode = 'a';
			}

			expect(host).toBeInstanceOf(Host);
			expect(warn).toHaveBeenCalledTimes(1);
			expect(String(warn.mock.calls[0]?.[0])).toContain('"mode"');
		});

		test('a third-party accessor decorator warns', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const tag = nextTag('observable');
			const host = createUnupgradedHost(tag, 'mode', 'b');

			@customElement(tag)
			class Host extends RadiantElement {
				@observableAccessor accessor mode: unknown = 'a';
			}

			expect(host).toBeInstanceOf(Host);
			expect(warn).toHaveBeenCalledTimes(1);
			expect(String(warn.mock.calls[0]?.[0])).toContain('shadows the class accessor');
		});

		test('stays silent when nothing was assigned early, for @prop, and when warnings are disabled', () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const cleanTag = nextTag('accessor-clean');
			const propTag = nextTag('accessor-prop');
			const silentTag = nextTag('accessor-silent');
			document.body.appendChild(document.createElement(cleanTag));
			createUnupgradedHost(propTag, 'mode', 'b');

			@customElement(cleanTag)
			class Clean extends RadiantElement {
				accessor mode = 'a';
			}

			@customElement(propTag)
			class WithProp extends RadiantElement {
				@prop({ type: String }) mode = 'a';
			}

			setDevWarningsEnabled(false);
			createUnupgradedHost(silentTag, 'mode', 'b');

			@customElement(silentTag)
			class Silent extends RadiantElement {
				accessor mode = 'a';
			}

			expect([Clean, WithProp, Silent]).toHaveLength(3);
			expect(warn).not.toHaveBeenCalled();
		});
	});
});
