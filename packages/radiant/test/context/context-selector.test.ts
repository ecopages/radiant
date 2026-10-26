import '../../src/server/install-ssr-runtime';
import { describe, expect, test } from 'vitest';
import { createContext } from '../../src/context/create-context';
import { contextSelector } from '../../src/context/decorators/context-selector';
import { RadiantElement } from '../../src/core/radiant-element';

declare const __LEGACY_ENVIRONMENT__: boolean;

const countContext = createContext<{ count: number }>(Symbol('context-selector-method'));

describe(`@contextSelector (${__LEGACY_ENVIRONMENT__ ? 'legacy' : 'standard'} decorators)`, () => {
	test('throws a TypeError naming @onContextUpdate when it decorates a method', () => {
		const defineMethodSelector = () => {
			class MethodSelector extends RadiantElement {
				// @ts-expect-error a method target is not a field
				@contextSelector({ context: countContext, select: (value) => value.count })
				onCount(_count: number): void {}
			}

			return MethodSelector;
		};

		expect(defineMethodSelector).toThrow(TypeError);
		expect(defineMethodSelector).toThrow(/Use @onContextUpdate/);
	});
});
