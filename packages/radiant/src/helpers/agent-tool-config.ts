/**
 * Returns a config with the properties of `config` except `omit`, and `overrides` on top, without reading any getter.
 *
 * @param config The agent tool config to copy, such as one shared by several tools.
 * @param overrides Properties that replace the same ones of `config`.
 * @param omit Keys of `config` to leave out of the copy. A key that `overrides` also sets stays, with the override.
 *
 * @remarks
 * Spreading `config` would call its getters, and a lazy `inputSchema` or `parse` must run only when the tool is
 * registered. Property descriptors are copied instead, so a getter stays a getter and is not read.
 * The copies are configurable, so a frozen config can be copied and overridden. A getter in `overrides` is copied the
 * same way.
 *
 * @example
 * ```ts
 * const cartTool = {
 * 	name: 'add_to_cart',
 * 	description: 'Adds a product to the cart by its SKU.',
 * 	inputSchema: () => import('./add-item').then((m) => m.addItemJsonSchema),
 * 	execute: addItem,
 * };
 *
 * createAgentTool(host, withConfig(cartTool, { getEnabled: () => shopIsOpen() }));
 * ```
 */
export function withConfig<Config extends object, Overrides extends object, Omitted extends keyof Config = never>(
	config: Config,
	overrides: Overrides,
	omit: readonly Omitted[] = [],
): Omit<Config, keyof Overrides | Omitted> & Overrides {
	const copy = {};
	const copyDescriptors = (source: object) => {
		for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(source))) {
			Object.defineProperty(copy, key, { ...descriptor, configurable: true });
		}
	};
	copyDescriptors(config);
	for (const key of omit) {
		Reflect.deleteProperty(copy, key);
	}
	copyDescriptors(overrides);
	return copy as Omit<Config, keyof Overrides | Omitted> & Overrides;
}
