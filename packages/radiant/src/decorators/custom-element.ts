import type {
	LegacyClassDecoratorArgs,
	StandardClassDecoratorArgs,
	StandardOrLegacyClassDecoratorArgs,
} from '../types';
import { customElement as legacyCustomElement } from './legacy/custom-element';
import { customElement as standardCustomElement } from './standard/custom-element';

/**
 * Registers a web component with the given name on the global `window.customElements` registry.
 * @param name selector name.
 * @param options {@link ElementDefinitionOptions}
 */
export function customElement(name: string, options?: ElementDefinitionOptions) {
	return function (
		protoOrTarget: StandardOrLegacyClassDecoratorArgs['protoOrTarget'],
		nameOrContext?: StandardOrLegacyClassDecoratorArgs['nameOrContext'],
	): any {
		if (typeof nameOrContext !== 'undefined') {
			return standardCustomElement(name, options)(
				protoOrTarget as StandardClassDecoratorArgs['protoOrTarget'],
				nameOrContext as StandardClassDecoratorArgs['nameOrContext'],
			);
		}
		return legacyCustomElement(name, options)(protoOrTarget as LegacyClassDecoratorArgs['protoOrTarget']);
	};
}
