/**
 * Returns a config with the properties of `config` except `omit`, and `overrides` on top, without reading any getter.
 *
 * @remarks
 * Spreading `config` would call its getters, and a lazy `inputSchema` or `parse` must run only when the tool is
 * registered. Property descriptors are copied instead, so a getter stays a getter. The copies are configurable, so a
 * frozen config can be copied and overridden.
 */
export function withConfig<Config extends object, Overrides extends object, Omitted extends keyof Config = never>(
	config: Config,
	overrides: Overrides,
	omit: readonly Omitted[] = [],
): Omit<Config, keyof Overrides | Omitted> & Overrides {
	const copy = {};
	for (const source of [config, overrides]) {
		for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(source))) {
			Object.defineProperty(copy, key, { ...descriptor, configurable: true });
		}
	}
	for (const key of omit) {
		Reflect.deleteProperty(copy, key);
	}
	return copy as Omit<Config, keyof Overrides | Omitted> & Overrides;
}
