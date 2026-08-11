import type { JsxRenderable } from '@ecopages/jsx';

export type DocsArgs = Record<string, unknown>;

/** Author-declared control kinds in `argTypes`. Presentation is chosen by heuristics. */
export type DocsControlType = 'select' | 'boolean' | 'text' | 'number';

export type DocsArgType<TValue = unknown> = {
	control?: { type?: DocsControlType };
	/** Non-distributive so string unions stay as `readonly Union[]`, not a union of arrays. */
	options?: [TValue] extends [string] ? readonly TValue[] : readonly string[];
};

export type DocsArgTypes<TArgs extends DocsArgs> = {
	[K in keyof TArgs]?: DocsArgType<TArgs[K]>;
};

export type DocsDecoratorContext<TArgs extends DocsArgs = DocsArgs> = {
	args: TArgs;
	parameters: { docs: { id: string } };
};

export type DocsDecorator<TArgs extends DocsArgs = DocsArgs> = (
	story: () => JsxRenderable,
	context: DocsDecoratorContext<TArgs>,
) => JsxRenderable;

export type DocsMeta<TArgs extends DocsArgs = DocsArgs> = {
	/** Package slug for live example imports (`@ecopages/radiant-ui/<component>`). */
	component?: string;
	exportName?: string;
	args?: Partial<TArgs>;
	argTypes?: DocsArgTypes<TArgs>;
	decorators?: DocsDecorator<TArgs>[];
	render?: (args: TArgs) => JsxRenderable;
	/** Optional live example builder; otherwise a generic prop dump is used. */
	exampleCode?: (args: TArgs) => string;
};

export type DocsStory<TArgs extends DocsArgs = DocsArgs> = {
	args?: Partial<TArgs>;
	decorators?: DocsDecorator<TArgs>[];
	render?: (args: TArgs) => JsxRenderable;
	/** Optional source builder for a story whose child structure differs from its meta default. */
	exampleCode?: (args: TArgs) => string;
	parameters: { docs: { id: string } };
};

/**
 * Extracts a method type so callback parameters stay bivariant under `strictFunctionTypes`.
 *
 * @remarks
 * Uses method syntax (not a property) so parameters are bivariant. Needed so authored
 * `DocsMeta<T>` / `DocsStory<T>` values remain assignable to the erased registry types
 * without `any` on callback parameters.
 */
type Bivariant<T extends (...args: never[]) => unknown> = {
	bivarianceHack(...args: Parameters<T>): ReturnType<T>;
}['bivarianceHack'];

/**
 * Type-erased docs meta for registry storage and canvas/controls props.
 *
 * @remarks
 * Callback fields are bivariant against {@link DocsArgs} so specific `DocsMeta<T>`
 * values assign without an `any` erasure. Prefer {@link docsStory} for registration.
 */
export type DocsMetaAny = Omit<DocsMeta<DocsArgs>, 'render' | 'decorators' | 'exampleCode'> & {
	decorators?: Bivariant<DocsDecorator<DocsArgs>>[];
	render?: Bivariant<(args: DocsArgs) => JsxRenderable>;
	exampleCode?: Bivariant<(args: DocsArgs) => string>;
};

/**
 * Type-erased docs story for registry storage and canvas/controls props.
 *
 * @remarks
 * Same bivariant callback boundary as {@link DocsMetaAny}.
 */
export type DocsStoryAny = Omit<DocsStory<DocsArgs>, 'render' | 'decorators' | 'exampleCode'> & {
	decorators?: Bivariant<DocsDecorator<DocsArgs>>[];
	render?: Bivariant<(args: DocsArgs) => JsxRenderable>;
	exampleCode?: Bivariant<(args: DocsArgs) => string>;
};

/**
 * Resolved presentation for one control after heuristics run.
 *
 * @remarks
 * Authors declare `control.type` + `options` in `argTypes`. The docs shell never
 * picks widgets ad hoc — {@link resolveControlPresentation} does.
 * `segmented` is only for short 2–3 option enums; longer sets use `select`.
 */
export type ResolvedDocsControl =
	| { name: string; kind: 'segmented'; options: string[] }
	| { name: string; kind: 'select'; options: string[] }
	| { name: string; kind: 'boolean' }
	| { name: string; kind: 'text' }
	| { name: string; kind: 'number' };
