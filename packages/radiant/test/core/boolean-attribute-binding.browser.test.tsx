import { createStore, fromExternalStore, state as createSignal, type WritableSignal } from '@ecopages/signals';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { signal } from '../../src/decorators/signal';
import { state } from '../../src/decorators/state';

let tag = 0;
const nextTag = (kind: string) => `bool-binding-${kind}-${++tag}`;

afterEach(() => {
	vi.restoreAllMocks();
	document.body.innerHTML = '';
});

async function mount<Host extends RadiantElement>(tagName: string): Promise<Host> {
	const host = document.createElement(tagName) as Host;
	document.body.append(host);
	await host.updateComplete;
	return host;
}

describe('a binding on a standard boolean attribute', () => {
	test('a @state binding patches hidden without re-running render() or warning', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const tagName = nextTag('state');
		let renders = 0;

		@customElement(tagName)
		class Panel extends RadiantElement<{ open: boolean; other: number }> {
			@state open = false;
			@state other = 0;

			override render() {
				renders += 1;
				return (
					<div>
						<p hidden={this.$.open.map((open) => !open)} inert={this.$.open.map((open) => !open)}>
							panel
						</p>
						<button disabled={this.$.open}>close</button>
						<i>{this.other}</i>
					</div>
				);
			}
		}

		const host = await mount<Panel>(tagName);
		const panel = host.querySelector('p')!;
		const button = host.querySelector('button')!;

		expect(panel.hidden).toBe(true);
		renders = 0;

		host.open = true;
		await host.updateComplete;

		expect(panel.hidden).toBe(false);
		expect(panel.hasAttribute('inert')).toBe(false);
		expect(button.disabled).toBe(true);
		expect(renders).toBe(0);

		host.other = 1;
		await host.updateComplete;
		renders = 0;
		host.open = false;
		await host.updateComplete;

		expect(host.querySelector('p')!.hidden).toBe(true);
		expect(renders).toBe(0);
		expect(warn).not.toHaveBeenCalled();
	});

	test('a store path binding patches hidden without re-running render()', async () => {
		const tagName = nextTag('store-path');
		let renders = 0;

		@customElement(tagName)
		class Player extends RadiantElement<{ media: { stage: string } }> {
			@state media = createStore({ stage: 'idle' });

			override render() {
				renders += 1;
				return <div hidden={this.$.media.stage.map((stage) => stage !== 'error')}>failed</div>;
			}
		}

		const host = await mount<Player>(tagName);
		renders = 0;

		host.media.stage = 'error';
		await host.updateComplete;

		expect(host.querySelector('div')!.hidden).toBe(false);
		expect(renders).toBe(0);
	});

	test('a @signal field passed directly patches hidden without re-running render()', async () => {
		const tagName = nextTag('signal');
		let renders = 0;

		@customElement(tagName)
		class Panel extends RadiantElement {
			@signal<boolean>({ initial: true })
			closed!: WritableSignal<boolean>;

			override render() {
				renders += 1;
				return <p hidden={this.closed}>panel</p>;
			}
		}

		const host = await mount<Panel>(tagName);
		renders = 0;

		host.closed.set(false);
		await host.updateComplete;

		expect(host.querySelector('p')!.hidden).toBe(false);
		expect(renders).toBe(0);
	});

	test('a module-level signal passed directly patches hidden without re-running render()', async () => {
		const tagName = nextTag('module-signal');
		const closed = createSignal(true);
		let renders = 0;

		@customElement(tagName)
		class Panel extends RadiantElement {
			override render() {
				renders += 1;
				return <p hidden={closed}>panel</p>;
			}
		}

		const host = await mount<Panel>(tagName);
		renders = 0;

		closed.set(false);
		await host.updateComplete;

		expect(host.querySelector('p')!.hidden).toBe(false);
		expect(renders).toBe(0);
	});

	test('an external store binding patches hidden without re-running render()', async () => {
		const tagName = nextTag('external');
		let current = { busy: true };
		const listeners = new Set<() => void>();
		const store = {
			getState: () => current,
			subscribe(listener: () => void) {
				listeners.add(listener);
				return () => listeners.delete(listener);
			},
		};
		let renders = 0;

		@customElement(tagName)
		class Spinner extends RadiantElement<{ busy: boolean }> {
			constructor() {
				super();
				this.registerReactiveMember(
					'busy',
					fromExternalStore(store, (snapshot) => snapshot.busy),
				);
			}

			override render() {
				renders += 1;
				return <span hidden={this.$.busy.map((busy) => !busy)}>loading</span>;
			}
		}

		const host = await mount<Spinner>(tagName);
		renders = 0;

		current = { busy: false };
		for (const listener of [...listeners]) listener();
		await host.updateComplete;

		expect(host.querySelector('span')!.hidden).toBe(true);
		expect(renders).toBe(0);
	});

	test('a direct read of the same field still re-runs render(), and with a binding too it warns', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const tagName = nextTag('direct');
		let renders = 0;

		@customElement(tagName)
		class Panel extends RadiantElement<{ closed: boolean }> {
			@state closed = true;

			override render() {
				renders += 1;
				return (
					<p hidden={this.closed} inert={this.$.closed}>
						panel
					</p>
				);
			}
		}

		const host = await mount<Panel>(tagName);
		renders = 0;

		host.closed = false;
		await host.updateComplete;

		expect(host.querySelector('p')!.hidden).toBe(false);
		expect(renders).toBe(1);
		expect(warn).toHaveBeenCalledTimes(1);
		expect(String(warn.mock.calls[0]?.[0])).toContain('"closed"');
	});

	test('a this.$ binding leaves the same attribute and property as a static value, for each kind of value', async () => {
		const values = [true, false, undefined, null, 'until-found'];
		const read = (element: Element & Record<string, unknown>, name: string) => ({
			attribute: element.getAttribute(name),
			property: Object.hasOwn(element, name) ? element[name] : 'none',
		});

		for (const value of values) {
			const staticTag = nextTag('static-value');
			const boundTag = nextTag('bound-value');

			@customElement(staticTag)
			class StaticHost extends RadiantElement {
				override render() {
					return (
						<div>
							<p hidden={value as boolean} />
							<x-field disabled={value} />
						</div>
					);
				}
			}

			@customElement(boundTag)
			class BoundHost extends RadiantElement<{ value: unknown }> {
				@state value: unknown = value;

				override render() {
					return (
						<div>
							<p hidden={this.$.value as never} />
							<x-field disabled={this.$.value} />
						</div>
					);
				}
			}

			const forms = [await mount<StaticHost>(staticTag), await mount<BoundHost>(boundTag)].map((host) => [
				read(host.querySelector('p')! as never, 'hidden'),
				read(host.querySelector('x-field')! as never, 'disabled'),
			]);

			expect(forms[1], String(value)).toEqual(forms[0]);
		}
	});
});
