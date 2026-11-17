import { waitFor } from '@testing-library/dom';
import { afterEach, describe, expect, test } from 'vitest';
import { getControllerIdentifier } from '../../src/core/controller-metadata';
import { RadiantController } from '../../src/core/radiant-controller';
import { controller } from '../../src/decorators/controller';
import {
	enableControllerReplacementForHmr,
	hasRegisteredController,
	registerController,
	replaceController,
	setControllerRegistrationStrategy,
	startControllers,
	stopControllers,
} from '../../src/controller-registry';

function createIdentifier(suffix: string): string {
	return `decorator-controller-${suffix}-${Math.random().toString(36).slice(2)}`;
}

afterEach(() => {
	document.body.innerHTML = '';
	setControllerRegistrationStrategy('keep-current');
	stopControllers();
});

describe('@controller', () => {
	test('rejects an identifier with a colon, which separates the identifier from the field in a hydration key', () => {
		class ColonController extends RadiantController {}
		const identifier = `${createIdentifier('colon')}:scoped`;

		expect(() => controller(identifier)(ColonController)).toThrow(/must not contain ":"/);
		expect(() => registerController(identifier, ColonController)).toThrow(/must not contain ":"/);
		expect(() => replaceController(identifier, ColonController)).toThrow(/must not contain ":"/);
		expect(hasRegisteredController(identifier)).toBe(false);
	});

	test('throws instead of registering a controller class that cannot store its identifier', () => {
		const identifier = createIdentifier('frozen');
		const FrozenController = Object.freeze(class FrozenController extends RadiantController {});

		expect(() => registerController(identifier, FrozenController)).toThrow(/could not be stored/);
		expect(hasRegisteredController(identifier)).toBe(false);
	});

	test('registers decorated controller constructors and records their identifier metadata', () => {
		const identifier = createIdentifier('metadata');

		class DecoratedController extends RadiantController {}

		const decorated = controller(identifier)(DecoratedController);

		expect(decorated).toBe(DecoratedController);
		expect(hasRegisteredController(identifier)).toBe(true);
		expect(getControllerIdentifier(DecoratedController)).toBe(identifier);
	});

	test('connects decorated controllers discovered from existing DOM', async () => {
		const identifier = createIdentifier('connect');
		document.body.innerHTML = `<section data-controller="${identifier}" data-id="decorated"></section>`;

		class DecoratedController extends RadiantController {
			override connect(): void {
				super.connect();
				(this.host as HTMLElement).setAttribute('data-connected', 'decorated');
			}
		}

		controller(identifier)(DecoratedController);
		startControllers(document.body);

		await waitFor(() => {
			const host = document.querySelector<HTMLElement>('[data-id="decorated"]');
			expect(host?.getAttribute('data-connected')).toBe('decorated');
		});
	});

	test('connects hosts in already-running runtimes when a decorated controller is registered later', async () => {
		const identifier = createIdentifier('late');
		document.body.innerHTML = `<section data-controller="${identifier}" data-id="late"></section>`;
		startControllers(document.body);

		class DecoratedController extends RadiantController {
			override connect(): void {
				super.connect();
				(this.host as HTMLElement).setAttribute('data-connected', 'late');
			}
		}

		controller(identifier)(DecoratedController);

		await waitFor(() => {
			const host = document.querySelector<HTMLElement>('[data-id="late"]');
			expect(host?.getAttribute('data-connected')).toBe('late');
		});
	});

	test('keeps the first decorated controller by default for duplicate identifiers', () => {
		const identifier = createIdentifier('keep-current');

		class InitialController extends RadiantController {}
		class DuplicateController extends RadiantController {}

		const initial = controller(identifier)(InitialController);
		const duplicate = controller(identifier)(DuplicateController);

		expect(initial).toBe(InitialController);
		expect(duplicate).toBe(InitialController);
		expect(getControllerIdentifier(InitialController)).toBe(identifier);
		expect(getControllerIdentifier(DuplicateController)).toBeUndefined();
	});

	test('returns an existing manually registered controller for duplicate identifiers', () => {
		const identifier = createIdentifier('existing');

		class RegisteredController extends RadiantController {}
		class DecoratedController extends RadiantController {}

		const registered = registerController(identifier, RegisteredController);
		const decorated = controller(identifier)(DecoratedController);

		expect(registered).toBe(RegisteredController);
		expect(decorated).toBe(RegisteredController);
		expect(getControllerIdentifier(RegisteredController)).toBe(identifier);
		expect(getControllerIdentifier(DecoratedController)).toBeUndefined();
	});

	test('replaces decorated controller registrations when replacement mode is enabled', async () => {
		const identifier = createIdentifier('replace');
		document.body.innerHTML = `<section data-controller="${identifier}" data-id="replace"></section>`;

		class InitialController extends RadiantController {
			override connect(): void {
				super.connect();
				(this.host as HTMLElement).setAttribute('data-connected', 'initial');
			}

			override disconnect(): void {
				(this.host as HTMLElement).setAttribute('data-disconnected', 'initial');
				super.disconnect();
			}
		}

		class ReplacementController extends RadiantController {
			override connect(): void {
				super.connect();
				(this.host as HTMLElement).setAttribute('data-connected', 'replacement');
			}
		}

		controller(identifier)(InitialController);
		startControllers(document.body);

		await waitFor(() => {
			const host = document.querySelector<HTMLElement>('[data-id="replace"]');
			expect(host?.getAttribute('data-connected')).toBe('initial');
		});

		enableControllerReplacementForHmr();
		const replacement = controller(identifier)(ReplacementController);

		expect(replacement).toBe(ReplacementController);
		expect(getControllerIdentifier(ReplacementController)).toBe(identifier);

		await waitFor(() => {
			const host = document.querySelector<HTMLElement>('[data-id="replace"]');
			expect(host?.getAttribute('data-disconnected')).toBe('initial');
			expect(host?.getAttribute('data-connected')).toBe('replacement');
		});
	});
});
