export type AutonomousCustomElementOptions = Omit<ElementDefinitionOptions, 'extends'> & { extends?: never };

/**
 * @remarks `extends` is checked dynamically because the public options type intentionally excludes it.
 */
export function assertAutonomousCustomElementOptions(options?: AutonomousCustomElementOptions): void {
	if (Reflect.get(options ?? {}, 'extends') !== undefined) {
		throw new TypeError('Customized built-ins are not supported. Use an autonomous custom element instead.');
	}
}
