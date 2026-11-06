import type { HostAttributes } from '../core/host-attributes';

export type AutonomousCustomElementOptions = Omit<ElementDefinitionOptions, 'extends'> & {
	extends?: never;
	/**
	 * Fixed attributes a `RadiantElement` host gets when its author did not write them, such as
	 * `{ role: 'complementary' }`.
	 *
	 * @remarks Server rendering applies them while it prepares the host, so they reach server output; the client
	 * applies them at the start of every connect, before `onConnected()`. An attribute already on the host is
	 * kept. A subclass inherits its base class's attributes and its own override them by name. Other custom element
	 * classes ignore them. Attributes that depend on state belong in `@bindTo` or `@onUpdated`.
	 */
	hostAttributes?: HostAttributes;
};

/**
 * @remarks `extends` is checked dynamically because the public options type intentionally excludes it.
 */
export function assertAutonomousCustomElementOptions(options?: AutonomousCustomElementOptions): void {
	if (Reflect.get(options ?? {}, 'extends') !== undefined) {
		throw new TypeError('Customized built-ins are not supported. Use an autonomous custom element instead.');
	}
}
