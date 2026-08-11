/**
 * Minimal ambient types for `unified`.
 *
 * @remarks
 * `unified` is a transitive dependency (via remark/rehype) and is not a direct
 * dependency of this app. Only the plugin shapes used by docs MDX are declared.
 * {@link Pluggable} is intentionally wide so concrete remark/rehype plugins and
 * `Plugin<[], Root>` values remain assignable under `strictFunctionTypes`.
 */
declare module 'unified' {
	export type Plugin<
		PluginParameters extends unknown[] = [],
		Input = unknown,
		Output = Input,
	> = (
		this: unknown,
		...settings: PluginParameters
	) => ((tree: Input, file?: unknown) => Output | undefined | void) | undefined | void;

	export type Pluggable =
		| ((...args: never[]) => unknown)
		| [(...args: never[]) => unknown, ...unknown[]]
		| false
		| null
		| undefined;

	export type PluggableList = Pluggable[];
}
