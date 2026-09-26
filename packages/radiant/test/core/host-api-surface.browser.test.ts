import { describe, expect, test } from 'vitest';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { REACTIVE_HOST } from '../../src/core/reactive-host';

const PLUMBING = [
	'notifyUpdate',
	'getReactiveBinding',
	'registerPostSyncCallback',
	'registerUpdatedCallback',
	'registerContextProvider',
	'registerHydrationBinding',
	'getContextProviders',
	'getHydrationBindings',
	'getSsrContextProviders',
	'getSsrHydrationBindings',
	'flushPostSyncCallbacks',
	'registerEventEmitter',
];

const AUTHORING = [
	'bind',
	'createReactiveField',
	'createReactiveMember',
	'createReactiveProp',
	'defineReactiveBinding',
	'getReactiveMember',
	'registerCleanupCallback',
	'registerConnectedCallback',
	'registerReactiveMember',
	'registerUpdateCallback',
	'requestUpdate',
	'update',
];

describe.each([
	['RadiantElement', RadiantElement.prototype],
	['RadiantController', RadiantController.prototype],
])('%s public API', (_name, prototype) => {
	test('keeps framework plumbing behind REACTIVE_HOST', () => {
		expect(PLUMBING.filter((method) => method in prototype)).toEqual([]);
		expect(REACTIVE_HOST in prototype).toBe(true);
	});

	test('keeps the authoring API', () => {
		expect(AUTHORING.filter((method) => !(method in prototype))).toEqual([]);
	});
});
