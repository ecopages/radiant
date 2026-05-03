import { jsx } from '@ecopages/jsx';
import { waitFor } from '@testing-library/dom';
import { afterEach, describe, expect, test } from 'vitest';
import {
	ContextProvider,
	consumeContext,
	contextSelector,
	createContext,
	onContextUpdate,
	provideContext,
} from '../../src/context';
import { controller } from '../../src/decorators/controller';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import {
	enableControllerReplacementForHmr,
	registerController,
	replaceController,
	setControllerRegistrationStrategy,
	startControllers,
	stopControllers,
} from '../../src/controller-registry';

const connectedHosts: string[] = [];
const disconnectedHosts: string[] = [];
const registryContext = createContext<{ count: number }>(Symbol('registry-context'));

class RegistryShadowBoundaryHost extends HTMLElement {
	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
	}
}

class RegistryController extends RadiantController {
	override connect(): void {
		super.connect();
		connectedHosts.push((this.host as HTMLElement).dataset.id ?? 'missing');
		(this.host as HTMLElement).setAttribute('data-connected', 'yes');
	}

	override disconnect(): void {
		disconnectedHosts.push((this.host as HTMLElement).dataset.id ?? 'missing');
		(this.host as HTMLElement).setAttribute('data-disconnected', 'yes');
		super.disconnect();
	}
}

class RegistryRenderedClickController extends RadiantController<{ count: number }> {
	count = 0;

	override render() {
		return jsx('button', {
			'data-ref': 'toggle',
			'on:click': () => {
				this.count += 1;
				this.requestUpdate();
			},
			children: String(this.count),
		});
	}
}

class RegistryContextProviderController extends RadiantController {
	@provideContext<typeof registryContext>({
		context: registryContext,
		initialValue: { count: 1 },
	})
	context!: ContextProvider<typeof registryContext>;

	override connect(): void {
		super.connect();
		(this.host as HTMLElement & { context?: ContextProvider<typeof registryContext> }).context = this.context;
	}

	override disconnect(): void {
		delete (this.host as HTMLElement & { context?: ContextProvider<typeof registryContext> }).context;
		super.disconnect();
	}
}

class RegistryContextConsumerController extends RadiantController {
	@consumeContext(registryContext) context!: ContextProvider<typeof registryContext>;

	@contextSelector({ context: registryContext, select: (context) => context.count })
	count = 0;

	@onContextUpdate({ context: registryContext, select: (context) => context.count })
	onCountChange(count: number) {
		this.host.setAttribute('data-count', String(count));
	}
}

class RegistryContextConsumerElement extends RadiantElement {
	@consumeContext(registryContext) context!: ContextProvider<typeof registryContext>;

	@contextSelector({ context: registryContext, select: (context) => context.count })
	count = 0;

	override render() {
		return this.count.toString();
	}
}

registerController('registry-controller-test', RegistryController);
registerController('registry-rendered-click', RegistryRenderedClickController);
registerController('registry-context-provider', RegistryContextProviderController);
registerController('registry-context-consumer', RegistryContextConsumerController);

if (!customElements.get('registry-context-consumer-element')) {
	customElements.define('registry-context-consumer-element', RegistryContextConsumerElement);
}

if (!customElements.get('registry-shadow-boundary')) {
	customElements.define('registry-shadow-boundary', RegistryShadowBoundaryHost);
}

afterEach(() => {
	connectedHosts.length = 0;
	disconnectedHosts.length = 0;
	document.body.innerHTML = '';
	setControllerRegistrationStrategy('keep-current');
	stopControllers();
});

describe('controller registry', () => {
	test('connects registered controllers discovered from existing DOM', async () => {
		document.body.innerHTML = '<section data-controller="registry-controller-test" data-id="alpha"></section>';

		startControllers(document.body);

		await waitFor(() => {
			const host = document.querySelector<HTMLElement>('[data-id="alpha"]');
			expect(host?.getAttribute('data-connected')).toBe('yes');
			expect(connectedHosts).toEqual(['alpha']);
		});
	});

	test('tracks added, removed, and reconfigured controller hosts', async () => {
		const runtime = startControllers(document.body);
		const host = document.createElement('div');
		host.dataset.id = 'beta';
		host.setAttribute('data-controller', 'registry-controller-test');
		document.body.appendChild(host);

		await waitFor(() => {
			expect(host.getAttribute('data-connected')).toBe('yes');
			expect(connectedHosts).toContain('beta');
		});

		host.removeAttribute('data-controller');

		await waitFor(() => {
			expect(disconnectedHosts).toContain('beta');
			expect(host.getAttribute('data-disconnected')).toBe('yes');
		});

		host.removeAttribute('data-disconnected');
		host.setAttribute('data-controller', 'registry-controller-test');

		await waitFor(() => {
			expect(connectedHosts).toEqual(['beta', 'beta']);
		});

		runtime.stop();
	});

	test('connects hosts when a controller is registered after runtimes have started', async () => {
		document.body.innerHTML = '<section data-controller="late-controller" data-id="gamma"></section>';
		startControllers(document.body);

		class LateController extends RadiantController {
			override connect(): void {
				super.connect();
				(this.host as HTMLElement).setAttribute('data-connected', 'late');
			}
		}

		registerController('late-controller', LateController);

		await waitFor(() => {
			const host = document.querySelector<HTMLElement>('[data-id="gamma"]');
			expect(host?.getAttribute('data-connected')).toBe('late');
		});
	});

	test('renders and wires event bindings for registry-started render controllers over existing host content', async () => {
		document.body.innerHTML =
			'<section data-controller="registry-rendered-click" data-id="rendered-click"><button data-ref="toggle">0</button></section>';

		startControllers(document.body);

		const host = document.querySelector<HTMLElement>('[data-id="rendered-click"]');

		await waitFor(() => {
			expect(host?.querySelector('[data-ref="toggle"]')?.textContent).toBe('0');
		});

		host?.querySelector<HTMLButtonElement>('[data-ref="toggle"]')?.click();

		await waitFor(() => {
			expect(host?.querySelector('[data-ref="toggle"]')?.textContent).toBe('1');
		});
	});

	test('silently keeps the first controller registered for an existing identifier', async () => {
		class PrimaryDuplicateRegistryController extends RadiantController {
			override connect(): void {
				super.connect();
				(this.host as HTMLElement).setAttribute('data-connected', 'primary');
			}
		}

		class SecondaryDuplicateRegistryController extends RadiantController {
			override connect(): void {
				super.connect();
				(this.host as HTMLElement).setAttribute('data-connected', 'secondary');
			}
		}

		const identifier = 'registry-duplicate-keep-current';

		expect(registerController(identifier, PrimaryDuplicateRegistryController)).toBe(
			PrimaryDuplicateRegistryController,
		);
		expect(registerController(identifier, SecondaryDuplicateRegistryController)).toBe(
			PrimaryDuplicateRegistryController,
		);

		document.body.innerHTML = `<section data-controller="${identifier}" data-id="duplicate"></section>`;
		startControllers(document.body);

		await waitFor(() => {
			const host = document.querySelector<HTMLElement>('[data-id="duplicate"]');
			expect(host?.getAttribute('data-connected')).toBe('primary');
		});
	});

	test('replaces connected controller instances when explicitly requested', async () => {
		class InitialReplacementController extends RadiantController {
			override connect(): void {
				super.connect();
				(this.host as HTMLElement).setAttribute('data-connected', 'initial');
			}

			override disconnect(): void {
				(this.host as HTMLElement).setAttribute('data-disconnected', 'initial');
				super.disconnect();
			}
		}

		class NextReplacementController extends RadiantController {
			override connect(): void {
				super.connect();
				(this.host as HTMLElement).setAttribute('data-connected', 'replacement');
			}
		}

		const identifier = 'registry-explicit-replace';

		registerController(identifier, InitialReplacementController);
		document.body.innerHTML = `<section data-controller="${identifier}" data-id="replace"></section>`;
		startControllers(document.body);

		await waitFor(() => {
			const host = document.querySelector<HTMLElement>('[data-id="replace"]');
			expect(host?.getAttribute('data-connected')).toBe('initial');
		});

		replaceController(identifier, NextReplacementController);

		await waitFor(() => {
			const host = document.querySelector<HTMLElement>('[data-id="replace"]');
			expect(host?.getAttribute('data-disconnected')).toBe('initial');
			expect(host?.getAttribute('data-connected')).toBe('replacement');
		});
	});

	test('controller decorator uses the replace strategy when explicitly enabled', async () => {
		const identifier = 'registry-decorator-replace';
		document.body.innerHTML = `<section data-controller="${identifier}" data-id="decorator-replace"></section>`;
		startControllers(document.body);

		class InitialDecoratorController extends RadiantController {
			override connect(): void {
				super.connect();
				(this.host as HTMLElement).setAttribute('data-connected', 'initial');
			}
		}

		controller(identifier)(InitialDecoratorController);

		await waitFor(() => {
			const host = document.querySelector<HTMLElement>('[data-id="decorator-replace"]');
			expect(host?.getAttribute('data-connected')).toBe('initial');
		});

		enableControllerReplacementForHmr();

		class ReplacementDecoratorController extends RadiantController {
			override connect(): void {
				super.connect();
				(this.host as HTMLElement).setAttribute('data-connected', 'replacement');
			}
		}

		controller(identifier)(ReplacementDecoratorController);

		await waitFor(() => {
			const host = document.querySelector<HTMLElement>('[data-id="decorator-replace"]');
			expect(host?.getAttribute('data-connected')).toBe('replacement');
		});
	});

	test('resolves context between registry-started provider and consumer controllers', async () => {
		document.body.innerHTML =
			'<section data-controller="registry-context-provider" data-id="provider">' +
			'<div data-controller="registry-context-consumer" data-id="consumer"></div>' +
			'</section>';

		startControllers(document.body);

		const providerHost = document.querySelector<HTMLElement>('[data-id="provider"]');
		const consumerHost = document.querySelector<HTMLElement>('[data-id="consumer"]');

		await waitFor(() => {
			expect(providerHost).not.toBeNull();
			expect(consumerHost?.getAttribute('data-count')).toBe('1');
		});

		const providerController = (
			providerHost as HTMLElement & {
				context: ContextProvider<typeof registryContext>;
			}
		).context;

		providerController.setContext({ count: 4 });

		await waitFor(() => {
			expect(consumerHost?.getAttribute('data-count')).toBe('4');
		});
	});

	test('resolves context from a registry-started controller provider into a nested RadiantElement consumer', async () => {
		document.body.innerHTML =
			'<section data-controller="registry-context-provider" data-id="provider">' +
			'<registry-context-consumer-element></registry-context-consumer-element>' +
			'</section>';

		startControllers(document.body);

		const providerHost = document.querySelector<HTMLElement>('[data-id="provider"]');
		const consumer = document.querySelector(
			'registry-context-consumer-element',
		) as RegistryContextConsumerElement | null;

		await waitFor(() => {
			expect(consumer?.textContent).toBe('1');
		});

		const providerController = (
			providerHost as HTMLElement & {
				context: ContextProvider<typeof registryContext>;
			}
		).context;

		providerController.setContext({ count: 6 });

		await waitFor(() => {
			expect(consumer?.textContent).toBe('6');
		});
	});

	test('resolves context across a shadow root when controllers are started for that shadow boundary', async () => {
		const providerHost = document.createElement('section');
		providerHost.dataset.id = 'provider';
		providerHost.setAttribute('data-controller', 'registry-context-provider');

		const shadowBoundary = document.createElement('registry-shadow-boundary') as RegistryShadowBoundaryHost;
		const consumerHost = document.createElement('div');
		consumerHost.dataset.id = 'shadow-consumer';
		consumerHost.setAttribute('data-controller', 'registry-context-consumer');
		shadowBoundary.shadowRoot?.appendChild(consumerHost);
		providerHost.appendChild(shadowBoundary);
		document.body.appendChild(providerHost);

		startControllers(document.body);
		startControllers(shadowBoundary.shadowRoot!);

		await waitFor(() => {
			expect(consumerHost.getAttribute('data-count')).toBe('1');
		});

		const providerController = (
			providerHost as HTMLElement & {
				context: ContextProvider<typeof registryContext>;
			}
		).context;

		providerController.setContext({ count: 8 });

		await waitFor(() => {
			expect(consumerHost.getAttribute('data-count')).toBe('8');
		});
	});
});
