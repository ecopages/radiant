import type { RadiantController } from './core/radiant-controller';
import { setControllerIdentifier } from './core/controller-metadata';

export const CONTROLLER_ATTRIBUTE = 'data-controller';

export type ControllerConstructor<TController extends RadiantController = RadiantController> = new (
	host: Element,
) => TController;

export type ControllerRegistrationStrategy = 'keep-current' | 'replace';

type ControllerRegistryGlobalState = {
	activeRuntimes: Set<ControllerRegistryRuntime>;
	controllerRegistrationStrategy: ControllerRegistrationStrategy;
	controllerRegistry: Map<string, ControllerConstructor>;
};

export const CONTROLLER_REGISTRY_STATE_KEY = Symbol.for('@ecopages/radiant.controller-registry-state');

function getControllerRegistryGlobalState(): ControllerRegistryGlobalState {
	const globalScope = globalThis as typeof globalThis & Record<PropertyKey, unknown>;
	const existingState = globalScope[CONTROLLER_REGISTRY_STATE_KEY];

	if (existingState) {
		return existingState as ControllerRegistryGlobalState;
	}

	const nextState: ControllerRegistryGlobalState = {
		activeRuntimes: new Set<ControllerRegistryRuntime>(),
		controllerRegistrationStrategy: 'keep-current',
		controllerRegistry: new Map<string, ControllerConstructor>(),
	};

	globalScope[CONTROLLER_REGISTRY_STATE_KEY] = nextState;

	return nextState;
}

const controllerRegistryState = getControllerRegistryGlobalState();
const controllerRegistry = controllerRegistryState.controllerRegistry;
const activeRuntimes = controllerRegistryState.activeRuntimes;

export function parseControllerIdentifiers(element: Element): string[] {
	const value = element.getAttribute(CONTROLLER_ATTRIBUTE);

	if (!value) {
		return [];
	}

	return value
		.split(/\s+/)
		.map((identifier) => identifier.trim())
		.filter((identifier) => identifier.length > 0);
}

export function visitControllerElements(root: ParentNode, visit: (element: Element) => void): void {
	if (root instanceof Element && root.hasAttribute(CONTROLLER_ATTRIBUTE)) {
		visit(root);
	}

	for (const element of Array.from(root.querySelectorAll(`[${CONTROLLER_ATTRIBUTE}]`))) {
		visit(element);
	}
}

export class ControllerRegistryRuntime {
	private readonly controllersByElement = new Map<Element, Map<string, RadiantController>>();
	private observer?: MutationObserver;
	private stopped = false;

	constructor(private readonly root: ParentNode = document) {
		this.start();
	}

	public stop(): void {
		if (this.stopped) {
			return;
		}

		this.stopped = true;
		this.observer?.disconnect();
		this.observer = undefined;

		for (const [element, controllers] of this.controllersByElement) {
			for (const [identifier] of controllers) {
				this.disconnectController(element, identifier);
			}
		}

		activeRuntimes.delete(this);
	}

	public reconcileRegisteredController(identifier: string): void {
		visitControllerElements(this.root, (element) => {
			if (!parseControllerIdentifiers(element).includes(identifier)) {
				return;
			}

			this.connectController(element, identifier);
		});
	}

	public replaceRegisteredController(identifier: string): void {
		for (const [element, controllers] of Array.from(this.controllersByElement.entries())) {
			if (!controllers.has(identifier)) {
				continue;
			}

			this.disconnectController(element, identifier);
		}

		this.reconcileRegisteredController(identifier);
	}

	private start(): void {
		visitControllerElements(this.root, (element) => {
			this.reconcileElement(element);
		});

		if (typeof MutationObserver === 'undefined') {
			activeRuntimes.add(this);
			return;
		}

		this.observer = new MutationObserver((records) => {
			for (const record of records) {
				if (record.type === 'attributes' && record.target instanceof Element) {
					this.reconcileElement(record.target);
					continue;
				}

				for (const removedNode of Array.from(record.removedNodes)) {
					if (!(removedNode instanceof Element)) {
						continue;
					}

					visitControllerElements(removedNode, (element) => {
						this.disconnectElementControllers(element);
					});
				}

				for (const addedNode of Array.from(record.addedNodes)) {
					if (!(addedNode instanceof Element)) {
						continue;
					}

					visitControllerElements(addedNode, (element) => {
						this.reconcileElement(element);
					});
				}
			}
		});

		const observerRoot = this.root instanceof Document ? this.root.documentElement : this.root;

		this.observer.observe(observerRoot, {
			attributeFilter: [CONTROLLER_ATTRIBUTE],
			attributes: true,
			childList: true,
			subtree: true,
		});

		activeRuntimes.add(this);
	}

	private reconcileElement(element: Element): void {
		const nextIdentifiers = new Set(parseControllerIdentifiers(element));
		const currentControllers = this.controllersByElement.get(element);

		if (currentControllers) {
			for (const identifier of currentControllers.keys()) {
				if (!nextIdentifiers.has(identifier)) {
					this.disconnectController(element, identifier);
				}
			}
		}

		for (const identifier of nextIdentifiers) {
			this.connectController(element, identifier);
		}
	}

	private connectController(element: Element, identifier: string): void {
		const controllerConstructor = controllerRegistry.get(identifier);

		if (!controllerConstructor) {
			return;
		}

		let controllers = this.controllersByElement.get(element);

		if (!controllers) {
			controllers = new Map();
			this.controllersByElement.set(element, controllers);
		}

		if (controllers.has(identifier)) {
			return;
		}

		const controller = new controllerConstructor(element);
		controllers.set(identifier, controller);
		controller.connect();
	}

	private disconnectController(element: Element, identifier: string): void {
		const controllers = this.controllersByElement.get(element);

		if (!controllers) {
			return;
		}

		const controller = controllers.get(identifier);

		if (!controller) {
			return;
		}

		controller.disconnect();
		controllers.delete(identifier);

		if (controllers.size === 0) {
			this.controllersByElement.delete(element);
		}
	}

	private disconnectElementControllers(element: Element): void {
		const controllers = this.controllersByElement.get(element);

		if (!controllers) {
			return;
		}

		for (const identifier of Array.from(controllers.keys())) {
			this.disconnectController(element, identifier);
		}
	}
}

export function registerController<
	TController extends RadiantController,
	TConstructor extends ControllerConstructor<TController>,
>(identifier: string, controller: TConstructor): TConstructor {
	const existingController = controllerRegistry.get(identifier);

	if (existingController) {
		return existingController as TConstructor;
	}

	setControllerIdentifier(controller as unknown as CustomElementConstructor, identifier);
	controllerRegistry.set(identifier, controller);

	for (const runtime of Array.from(activeRuntimes)) {
		runtime.reconcileRegisteredController(identifier);
	}

	return controller;
}

export function hasRegisteredController(identifier: string): boolean {
	return controllerRegistry.has(identifier);
}

export function replaceController<
	TController extends RadiantController,
	TConstructor extends ControllerConstructor<TController>,
>(identifier: string, controller: TConstructor): TConstructor {
	const existingController = controllerRegistry.get(identifier);

	if (existingController === controller) {
		return controller;
	}

	setControllerIdentifier(controller as unknown as CustomElementConstructor, identifier);
	controllerRegistry.set(identifier, controller);

	for (const runtime of Array.from(activeRuntimes)) {
		runtime.replaceRegisteredController(identifier);
	}

	return controller;
}

export function setControllerRegistrationStrategy(strategy: ControllerRegistrationStrategy): void {
	controllerRegistryState.controllerRegistrationStrategy = strategy;
}

export function enableControllerReplacementForHmr(): void {
	setControllerRegistrationStrategy('replace');
}

export function disableControllerReplacementForHmr(): void {
	setControllerRegistrationStrategy('keep-current');
}

export function registerControllerWithConfiguredStrategy<
	TController extends RadiantController,
	TConstructor extends ControllerConstructor<TController>,
>(identifier: string, controller: TConstructor): TConstructor {
	if (controllerRegistryState.controllerRegistrationStrategy === 'replace') {
		return replaceController(identifier, controller);
	}

	return registerController(identifier, controller);
}

export function startControllers(root: ParentNode = document): ControllerRegistryRuntime {
	return new ControllerRegistryRuntime(root);
}

export function stopControllers(): void {
	for (const runtime of Array.from(activeRuntimes)) {
		runtime.stop();
	}
}
