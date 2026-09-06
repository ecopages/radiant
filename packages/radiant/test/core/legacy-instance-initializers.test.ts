import { describe, expect, test } from 'vitest';
import {
	registerLegacyInstanceInitializer,
	runLegacyInstanceInitializers,
} from '../../src/decorators/legacy/instance-initializers';

describe('legacy instance initializers', () => {
	test('runs an inherited initializer once for a grandchild instance', () => {
		const calls: string[] = [];

		class BaseHost {}
		class ChildHost extends BaseHost {}
		class GrandchildHost extends ChildHost {}

		registerLegacyInstanceInitializer(BaseHost.prototype, () => {
			calls.push('base');
		});
		registerLegacyInstanceInitializer(ChildHost.prototype, () => {
			calls.push('child');
		});

		runLegacyInstanceInitializers(new GrandchildHost());

		expect(calls).toEqual(['base', 'child']);
	});

	test('keeps base and derived instance initializer registries separate', () => {
		const calls: string[] = [];

		class BaseHost {}
		class DerivedHost extends BaseHost {}

		registerLegacyInstanceInitializer(BaseHost.prototype, () => {
			calls.push('base');
		});
		registerLegacyInstanceInitializer(DerivedHost.prototype, () => {
			calls.push('derived');
		});

		runLegacyInstanceInitializers(new BaseHost());
		expect(calls).toEqual(['base']);

		calls.length = 0;
		runLegacyInstanceInitializers(new DerivedHost());
		expect(calls).toEqual(['base', 'derived']);
	});
});
