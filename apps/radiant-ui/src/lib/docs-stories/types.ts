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
	args?: Partial<TArgs>;
	argTypes?: DocsArgTypes<TArgs>;
	decorators?: DocsDecorator<TArgs>[];
	render?: (args: TArgs) => JsxRenderable;
};

export type DocsStory<TArgs extends DocsArgs = DocsArgs> = {
	args?: Partial<TArgs>;
	decorators?: DocsDecorator<TArgs>[];
	render?: (args: TArgs) => JsxRenderable;
	parameters: { docs: { id: string } };
};

/**
 * Docs shell / registry meta after args have been erased to {@link DocsArgs}.
 *
 * @remarks
 * `render` uses method syntax so authored `DocsMeta<T>` values stay assignable under
 * `strictFunctionTypes`. Decorators are opaque here — the shell only invokes them
 * after {@link docsStory} registration.
 */
export interface DocsMetaAny {
	args?: DocsArgs;
	argTypes?: DocsArgTypes<DocsArgs>;
	decorators?: readonly unknown[];
	render?(args: DocsArgs): JsxRenderable;
}

/**
 * Docs shell / registry story after args have been erased to {@link DocsArgs}.
 *
 * @remarks
 * Same interface boundary as {@link DocsMetaAny}.
 */
export interface DocsStoryAny {
	args?: DocsArgs;
	decorators?: readonly unknown[];
	render?(args: DocsArgs): JsxRenderable;
	parameters: { docs: { id: string } };
}

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
