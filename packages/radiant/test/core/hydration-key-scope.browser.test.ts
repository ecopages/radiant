import { waitFor } from '@testing-library/dom';
import type { WritableSignal } from '@ecopages/signals';
import { afterEach, describe, expect, test } from 'vitest';
import { ContextProvider, createContext, provideContext } from '../../src/context';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { controller } from '../../src/decorators/controller';
import { ensureLegacyHostReady } from '../../src/decorators/legacy/host-readiness';
import { customElement } from '../../src/decorators/custom-element';
import { signal } from '../../src/decorators/signal';
import type { HostSignal } from '../../src/signals/host-signal';

const firstContext = createContext<{ n: number }>(Symbol('hydration-scope-first'));
const secondContext = createContext<{ n: number }>(Symbol('hydration-scope-second'));

@controller('hydration-scope-first')
class FirstController extends RadiantController {
	@provideContext<typeof firstContext>({ context: firstContext, initialValue: { n: 0 }, hydrate: Object })
	value!: ContextProvider<typeof firstContext>;
}

@controller('hydration-scope-second')
class SecondController extends RadiantController {
	@provideContext<typeof secondContext>({ context: secondContext, initialValue: { n: 0 }, hydrate: Object })
	value!: ContextProvider<typeof secondContext>;
}

const elementContext = createContext<{ n: number }>(Symbol('hydration-scope-element-context'));

@customElement('hydration-scope-provider-element')
class ProviderElement extends RadiantElement {
	@provideContext<typeof elementContext>({ context: elementContext, initialValue: { n: 0 }, hydrate: Object })
	value!: ContextProvider<typeof elementContext>;
}

@controller('hydration-scope-signal')
class SignalController extends RadiantController {
	@signal({ hydrate: Number, initial: 0 }) count!: WritableSignal<number>;
}

class PlainController extends RadiantController {
	@signal({ hydrate: Number, initial: 0 }) count!: WritableSignal<number>;
}

@customElement('hydration-scope-element')
class SignalElement extends RadiantElement {
	@signal({ hydrate: Number, initial: 0 }) count!: WritableSignal<number>;
}

function signalScript(field: WritableSignal<number>): string | undefined {
	return (field as HostSignal<number>).renderHydrationScriptTag();
}

function create<T extends RadiantController>(Controller: new (host: Element) => T, host: Element): T {
	const instance = new Controller(host);
	ensureLegacyHostReady(instance, 'connect');
	return instance;
}

afterEach(() => {
	document.body.innerHTML = '';
});

describe('hydration keys on a host shared by several owners', () => {
	test('two controllers on one element hydrate their own provider payloads', () => {
		const source = document.createElement('div');
		const first = create(FirstController, source);
		const second = create(SecondController, source);
		first.value.setContext({ n: 1 });
		second.value.setContext({ n: 2 });
		const markup = `${first.value.renderHydrationScriptTag()}${second.value.renderHydrationScriptTag()}`;

		const target = document.createElement('div');
		target.setAttribute('data-controller', 'hydration-scope-first hydration-scope-second');
		target.innerHTML = markup;

		expect(create(FirstController, target).value.getContext()).toEqual({ n: 1 });
		expect(create(SecondController, target).value.getContext()).toEqual({ n: 2 });
		expect(markup).toContain('data-hydration-key="hydration-scope-first:value"');
		expect(markup).toContain('data-hydration-key="hydration-scope-second:value"');
	});

	test('an element host and a controller provide the same field name on one element without reading each other', async () => {
		const sourceElement = document.createElement('hydration-scope-provider-element') as ProviderElement;
		sourceElement.value.setContext({ n: 9 });
		const sourceController = create(FirstController, document.createElement('div'));
		sourceController.value.setContext({ n: 1 });
		const elementScript = sourceElement.value.renderHydrationScriptTag();
		const controllerScript = sourceController.value.renderHydrationScriptTag();

		document.body.innerHTML = `<hydration-scope-provider-element data-controller="hydration-scope-first">${controllerScript}${elementScript}</hydration-scope-provider-element>`;
		const element = document.querySelector<ProviderElement>('hydration-scope-provider-element')!;

		expect(elementScript).toContain('data-hydration-key="value"');
		expect(controllerScript).toContain('data-hydration-key="hydration-scope-first:value"');
		await waitFor(() => expect(element.value.getContext()).toEqual({ n: 9 }));
		expect(create(FirstController, element).value.getContext()).toEqual({ n: 1 });
	});

	test('an element host does not read the signal payload of a controller on the same element', async () => {
		const source = document.createElement('div');
		const sourceController = create(SignalController, source);
		sourceController.count.set(3);
		const sourceElement = document.createElement('hydration-scope-element') as SignalElement;
		sourceElement.count.set(7);
		const markup = `${signalScript(sourceController.count)}${signalScript(sourceElement.count)}`;

		document.body.innerHTML = `<hydration-scope-element data-controller="hydration-scope-signal">${markup}</hydration-scope-element>`;
		const element = document.querySelector<SignalElement>('hydration-scope-element')!;

		expect(signalScript(sourceController.count)).toContain('data-hydration-key="hydration-scope-signal:count"');
		expect(signalScript(sourceElement.count)).toContain('data-hydration-key="count"');
		await waitFor(() => expect(element.count.get()).toBe(7));
	});

	test('a controller registered without an identifier keeps the bare key', () => {
		const plain = create(PlainController, document.createElement('div'));
		plain.count.set(1);

		expect(signalScript(plain.count)).toContain('data-hydration-key="count"');
	});
});
