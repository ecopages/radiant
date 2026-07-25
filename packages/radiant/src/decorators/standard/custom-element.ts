import { setCustomElementTagName } from '../../core/custom-element-metadata';
import {
	attributeNameForProp,
	ensureObservedAttributes,
	REACTIVE_PROP_METADATA,
	type ReactivePropDefinition,
	registerReactivePropDefinition,
} from '../../core/reactive-prop-metadata';

export function customElement(name: string, options?: ElementDefinitionOptions) {
	return function <T extends CustomElementConstructor>(_: T, context: ClassDecoratorContext<T>) {
		context.addInitializer(function (this: T) {
			setCustomElementTagName(this, name);

			const metadata = context.metadata as Record<symbol, ReactivePropDefinition[]> | null;
			const definitions = metadata?.[REACTIVE_PROP_METADATA] ?? [];

			for (const definition of definitions) {
				registerReactivePropDefinition(this, definition.name, definition.options);
			}

			ensureObservedAttributes(
				this,
				definitions.map((definition) => attributeNameForProp(definition.name, definition.options)),
			);

			if (typeof customElements !== 'undefined' && !customElements.get(name)) {
				customElements.define(name, this, options);
			}
		});
	};
}
