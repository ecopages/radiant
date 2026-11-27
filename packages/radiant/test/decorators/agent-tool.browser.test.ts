import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { agentTool } from '../../src/decorators/agent-tool';
import { customElement } from '../../src/decorators/custom-element';
import { prop } from '../../src/decorators/prop';
import { RadiantController } from '../../src/core/radiant-controller';
import { controller } from '../../src/decorators/controller';
import { startControllers, stopControllers } from '../../src/controller-registry';
import { createAgentTool } from '../../src/helpers/create-agent-tool';
import {
	installFakeModelContext,
	uninstallFakeModelContext,
	type FakeModelContext,
} from '../fixtures/fake-model-context';

/** An element's connect-sync work runs in a microtask after it connects. */
const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

describe('agent tools on a RadiantElement', () => {
	let modelContext: FakeModelContext;

	beforeEach(() => {
		document.body.innerHTML = '';
		modelContext = installFakeModelContext();
	});

	afterEach(() => {
		uninstallFakeModelContext();
		vi.restoreAllMocks();
	});

	it('registers a decorated method while the element is connected and removes it on disconnect', async () => {
		@customElement('agent-tool-lifecycle')
		class Cart extends RadiantElement {
			items: string[] = [];

			@agentTool({ name: 'add-item', description: 'Adds an item' })
			addItem(sku: string) {
				this.items.push(sku);
				return this.items.length;
			}
		}

		const cart = document.createElement('agent-tool-lifecycle') as Cart;
		expect(modelContext.names).toEqual([]);

		document.body.appendChild(cart);
		await settle();
		expect(modelContext.names).toEqual(['add-item']);

		cart.remove();
		expect(modelContext.names).toEqual([]);

		document.body.appendChild(cart);
		await settle();
		expect(modelContext.names).toEqual(['add-item']);
	});

	it('keeps the decorated method callable and shares it with the agent', async () => {
		@customElement('agent-tool-shared-method')
		class Cart extends RadiantElement {
			items: string[] = [];

			@agentTool({ name: 'add-shared-item', description: 'Adds an item' })
			addItem(sku: string) {
				this.items.push(sku);
				return this.items.length;
			}
		}

		const cart = document.createElement('agent-tool-shared-method') as Cart;
		document.body.appendChild(cart);
		await settle();

		expect(cart.addItem('a')).toBe(1);
		const result = await modelContext.tools
			.get('add-shared-item')
			?.execute('b', { signal: new AbortController().signal });

		expect(result).toBe(2);
		expect(cart.items).toEqual(['a', 'b']);
	});

	it('validates the agent input with parse and rejects the call when it fails', async () => {
		@customElement('agent-tool-parse')
		class Cart extends RadiantElement {
			@agentTool({
				name: 'add-parsed-item',
				description: 'Adds an item',
				parse: (input: unknown) => {
					if (typeof input !== 'string') throw new TypeError('sku must be a string');
					return input;
				},
			})
			addItem(sku: string) {
				return sku;
			}
		}

		document.body.appendChild(document.createElement('agent-tool-parse') as Cart);
		await settle();
		const tool = modelContext.tools.get('add-parsed-item');

		await expect(tool?.execute('a', { signal: new AbortController().signal })).resolves.toBe('a');
		await expect(tool?.execute(1, { signal: new AbortController().signal })).rejects.toThrow(
			'sku must be a string',
		);
	});

	it('names the tool from the host, after its attributes have caught up', async () => {
		@customElement('agent-tool-named')
		class Cart extends RadiantElement {
			@prop({ type: String }) cartId = 'default';

			@agentTool({ name: (host: Cart) => `add-item-${host.cartId}`, description: 'Adds an item' })
			addItem() {}
		}

		const cart = document.createElement('agent-tool-named') as Cart;
		cart.setAttribute('cart-id', 'main');
		document.body.appendChild(cart);
		await settle();

		expect(modelContext.names).toEqual(['add-item-main']);
	});

	it('registers only while getEnabled is true, and follows the signal it reads', async () => {
		@customElement('agent-tool-enabled')
		class Dialog extends RadiantElement {
			@prop({ type: Boolean }) open = false;

			@agentTool({
				name: 'close-dialog',
				description: 'Closes the dialog',
				getEnabled: (host: Dialog) => host.open,
			})
			close() {
				this.open = false;
			}
		}

		const dialog = document.createElement('agent-tool-enabled') as Dialog;
		document.body.appendChild(dialog);
		await settle();
		expect(modelContext.names).toEqual([]);

		dialog.open = true;
		await vi.waitFor(() => expect(modelContext.names).toEqual(['close-dialog']));

		dialog.open = false;
		await vi.waitFor(() => expect(modelContext.names).toEqual([]));
	});

	it('reports a second element that reuses a name, and keeps the first registered', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

		@customElement('agent-tool-duplicate')
		class Cart extends RadiantElement {
			@agentTool({ name: 'duplicate-item', description: 'Adds an item' })
			addItem() {}
		}

		document.body.appendChild(document.createElement('agent-tool-duplicate') as Cart);
		document.body.appendChild(document.createElement('agent-tool-duplicate') as Cart);
		await settle();

		expect(modelContext.names).toEqual(['duplicate-item']);
		expect(error).toHaveBeenCalledTimes(1);
		expect(error.mock.calls[0]?.[0]).toContain('<agent-tool-duplicate>');
	});

	it('registers at once when createAgentTool runs on a connected element, and stops with the returned function', async () => {
		@customElement('agent-tool-function')
		class Panel extends RadiantElement {}

		const panel = document.createElement('agent-tool-function') as Panel;
		document.body.appendChild(panel);
		await settle();

		const stop = createAgentTool(panel, {
			name: 'open-panel',
			description: 'Opens the panel',
			execute: () => undefined,
		});
		expect(modelContext.names).toEqual(['open-panel']);

		stop();
		expect(modelContext.names).toEqual([]);

		panel.remove();
		document.body.appendChild(panel);
		await settle();
		expect(modelContext.names).toEqual([]);
	});

	it('waits for attributes when an element that is already in the page upgrades', async () => {
		document.body.innerHTML = '<agent-tool-upgraded cart-id="main"></agent-tool-upgraded>';

		@customElement('agent-tool-upgraded')
		class Cart extends RadiantElement {
			@prop({ type: String }) cartId = 'default';

			@agentTool({ name: (host: Cart) => `add-item-${host.cartId}`, description: 'Adds an item' })
			addItem() {}
		}

		await settle();

		expect(modelContext.names).toEqual(['add-item-main']);
		expect(modelContext.registrations.map((tool) => tool.name)).toEqual(['add-item-main']);
		expect(document.querySelector('agent-tool-upgraded')).toBeInstanceOf(Cart);
	});

	it('registers again under a new name when a signal the name reads changes', async () => {
		@customElement('agent-tool-renamed')
		class Cart extends RadiantElement {
			@prop({ type: String }) cartId = 'one';

			@agentTool({ name: (host: Cart) => `add-item-${host.cartId}`, description: 'Adds an item' })
			addItem() {}
		}

		const cart = document.createElement('agent-tool-renamed') as Cart;
		document.body.appendChild(cart);
		await settle();
		expect(modelContext.names).toEqual(['add-item-one']);

		cart.cartId = 'two';
		await vi.waitFor(() => expect(modelContext.names).toEqual(['add-item-two']));
	});

	it('registers again after a move without reporting an error when the browser frees the name a microtask later', async () => {
		modelContext.releaseOnAbort = 'microtask';
		const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

		@customElement('agent-tool-slow-release')
		class Cart extends RadiantElement {
			@agentTool({ name: 'add-slow-item', description: 'Adds an item' })
			addItem() {}
		}

		const cart = document.createElement('agent-tool-slow-release') as Cart;
		document.body.appendChild(cart);
		await settle();
		cart.remove();
		document.body.appendChild(cart);
		await settle();

		expect(modelContext.names).toEqual(['add-slow-item']);
		expect(error).not.toHaveBeenCalled();
	});

	it('hands the abort signal to a decorated method as its second argument', async () => {
		let received: AbortSignal | undefined;

		@customElement('agent-tool-signal')
		class Cart extends RadiantElement {
			@agentTool({ name: 'add-signal-item', description: 'Adds an item' })
			addItem(_input: unknown, options?: { signal: AbortSignal }) {
				received = options?.signal;
			}
		}

		document.body.appendChild(document.createElement('agent-tool-signal') as Cart);
		await settle();
		const signal = new AbortController().signal;
		await modelContext.tools.get('add-signal-item')?.execute({}, { signal });

		expect(received).toBe(signal);
	});

	it('follows a controller host: registered when it attaches, removed when it is removed', async () => {
		@controller('agent-tool-controller')
		class CartController extends RadiantController {
			@agentTool({ name: 'add-controller-item', description: 'Adds an item' })
			addItem() {}
		}
		document.body.innerHTML = '<div data-controller="agent-tool-controller"></div>';

		startControllers(document);
		await vi.waitFor(() => expect(modelContext.names).toEqual(['add-controller-item']));

		document.body.innerHTML = '';
		await vi.waitFor(() => expect(modelContext.names).toEqual([]));
		expect(CartController).toBeDefined();
		stopControllers();
	});

	describe('a config read when the tool is registered', () => {
		const schema = { type: 'object', properties: { sku: { type: 'string' } } };
		const registeredSchema = (name: string) =>
			(modelContext.tools.get(name) as { inputSchema?: unknown })?.inputSchema;

		it('never reads an inputSchema getter in a browser without document.modelContext', async () => {
			uninstallFakeModelContext();
			const reads = vi.fn();

			@customElement('agent-tool-lazy-without-context')
			class Cart extends RadiantElement {
				@agentTool({
					name: 'add-lazy-item',
					description: 'Adds an item',
					get inputSchema() {
						reads();
						return schema;
					},
				})
				addItem() {}
			}

			document.body.appendChild(document.createElement('agent-tool-lazy-without-context') as Cart);
			await settle();

			expect(reads).not.toHaveBeenCalled();
		});

		it('reads the getter when the tool is registered, not when the element is constructed', async () => {
			const reads = vi.fn();

			@customElement('agent-tool-lazy-with-context')
			class Cart extends RadiantElement {
				@agentTool({
					name: 'add-lazy-item',
					description: 'Adds an item',
					get inputSchema() {
						reads();
						return schema;
					},
				})
				addItem() {}
			}

			const cart = document.createElement('agent-tool-lazy-with-context') as Cart;
			expect(reads).not.toHaveBeenCalled();

			document.body.appendChild(cart);
			await settle();

			expect(reads).toHaveBeenCalledTimes(1);
			expect(registeredSchema('add-lazy-item')).toEqual(schema);
		});

		it('reads the getter again for each registration, once per connect', async () => {
			const reads = vi.fn();

			@customElement('agent-tool-lazy-reconnect')
			class Cart extends RadiantElement {
				@agentTool({
					name: 'add-lazy-item',
					description: 'Adds an item',
					get inputSchema() {
						reads();
						return schema;
					},
				})
				addItem() {}
			}

			const cart = document.createElement('agent-tool-lazy-reconnect') as Cart;
			document.body.appendChild(cart);
			await settle();
			cart.remove();
			document.body.appendChild(cart);
			await settle();

			expect(reads).toHaveBeenCalledTimes(2);
		});

		it('builds a parse getter only for a registered tool and validates with it', async () => {
			uninstallFakeModelContext();
			const builds = vi.fn();

			@customElement('agent-tool-lazy-parse-without-context')
			class Idle extends RadiantElement {
				@agentTool({
					name: 'add-idle-item',
					description: 'Adds an item',
					get parse() {
						builds();
						return (input: unknown) => input as string;
					},
				})
				addItem(_sku: string) {}
			}
			document.body.appendChild(document.createElement('agent-tool-lazy-parse-without-context') as Idle);
			await settle();
			expect(builds).not.toHaveBeenCalled();

			modelContext = installFakeModelContext();

			@customElement('agent-tool-lazy-parse')
			class Cart extends RadiantElement {
				received: unknown;

				@agentTool({
					name: 'add-parsed-lazy-item',
					description: 'Adds an item',
					get parse() {
						builds();
						return (input: unknown) => String((input as { sku: unknown }).sku);
					},
				})
				addItem(sku: string) {
					this.received = sku;
				}
			}
			const cart = document.createElement('agent-tool-lazy-parse') as Cart;
			document.body.appendChild(cart);
			await settle();
			await modelContext.tools
				.get('add-parsed-lazy-item')
				?.execute({ sku: 7 }, { signal: new AbortController().signal });

			expect(builds).toHaveBeenCalledTimes(1);
			expect(cart.received).toBe('7');
		});

		it('calls a function inputSchema when the tool is registered', async () => {
			const build = vi.fn(() => schema);

			@customElement('agent-tool-lazy-function')
			class Cart extends RadiantElement {
				@agentTool({ name: 'add-fn-item', description: 'Adds an item', inputSchema: build })
				addItem() {}
			}

			const cart = document.createElement('agent-tool-lazy-function') as Cart;
			expect(build).not.toHaveBeenCalled();

			document.body.appendChild(cart);
			await settle();

			expect(build).toHaveBeenCalledTimes(1);
			expect(registeredSchema('add-fn-item')).toEqual(schema);
		});

		it('registers a decorated method after an asynchronous schema resolves, and not when the host left first', async () => {
			let resolve!: (value: typeof schema) => void;
			const loading = new Promise<typeof schema>((resolvePromise) => {
				resolve = resolvePromise;
			});

			@customElement('agent-tool-async-schema')
			class Cart extends RadiantElement {
				@agentTool({ name: 'add-async-item', description: 'Adds an item', inputSchema: () => loading })
				addItem() {}
			}

			const cart = document.createElement('agent-tool-async-schema') as Cart;
			document.body.appendChild(cart);
			await settle();
			expect(modelContext.names).toEqual([]);

			resolve(schema);
			await vi.waitFor(() => expect(modelContext.names).toEqual(['add-async-item']));
			expect(registeredSchema('add-async-item')).toEqual(schema);

			cart.remove();
			expect(modelContext.names).toEqual([]);
		});

		it('registers nothing for a host that disconnects before its asynchronous schema arrives', async () => {
			let resolve!: (value: typeof schema) => void;
			const loading = new Promise<typeof schema>((resolvePromise) => {
				resolve = resolvePromise;
			});

			@customElement('agent-tool-async-gone')
			class Cart extends RadiantElement {
				@agentTool({ name: 'add-gone-item', description: 'Adds an item', inputSchema: () => loading })
				addItem() {}
			}

			const cart = document.createElement('agent-tool-async-gone') as Cart;
			document.body.appendChild(cart);
			await settle();
			cart.remove();
			resolve(schema);
			await settle();

			expect(modelContext.registrations).toEqual([]);
		});

		it('registers a frozen config', async () => {
			const frozen = Object.freeze({
				name: 'add-frozen-item',
				description: 'Adds an item',
				getEnabled: () => true,
				inputSchema: schema,
				execute: () => undefined,
			});

			@customElement('agent-tool-frozen-config')
			class Cart extends RadiantElement {
				constructor() {
					super();
					createAgentTool(this, frozen);
				}
			}

			document.body.appendChild(document.createElement('agent-tool-frozen-config') as Cart);
			await settle();

			expect(modelContext.names).toEqual(['add-frozen-item']);
			expect(Object.keys(modelContext.registrations[0] ?? {})).not.toContain('getEnabled');
		});

		it('keeps a plain inputSchema object working', async () => {
			@customElement('agent-tool-eager-schema')
			class Cart extends RadiantElement {
				@agentTool({ name: 'add-eager-item', description: 'Adds an item', inputSchema: schema })
				addItem() {}
			}

			document.body.appendChild(document.createElement('agent-tool-eager-schema') as Cart);
			await settle();

			expect(registeredSchema('add-eager-item')).toEqual(schema);
		});
	});
});
