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
});
