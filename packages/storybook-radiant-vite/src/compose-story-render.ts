import type { JsxRenderable } from '@ecopages/jsx';

type SsrStoryDefinition = {
	component?: unknown;
	decorators?: unknown[];
	parameters?: Record<string, unknown>;
	render?: unknown;
};

type SsrDecoratorContext = {
	args: Record<string, unknown>;
	id: string;
	parameters: Record<string, unknown>;
};

type SsrStoryDecorator = (story: () => JsxRenderable, context: SsrDecoratorContext) => JsxRenderable;

/**
 * @remarks Builds the CSF render tree (story render + reversed decorators) used by both
 * server-side story markup and client-side JSX hydration so the two paths cannot drift.
 */
export function composeStoryRender(
	storyModule: Record<string, unknown>,
	storyExport: string | undefined,
	args: Record<string, unknown>,
): () => JsxRenderable {
	const meta = storyModule.default as SsrStoryDefinition | undefined;
	const story = storyExport ? (storyModule[storyExport] as SsrStoryDefinition | undefined) : undefined;
	const render = story?.render ?? meta?.render ?? meta?.component;
	if (typeof render !== 'function') {
		throw new Error(`Story "${storyExport ?? 'default'}" does not provide a JSX render function.`);
	}

	let storyRender = () => (render as (nextArgs: Record<string, unknown>) => JsxRenderable)(args);
	const decorators = [...(meta?.decorators ?? []), ...(story?.decorators ?? [])];
	const context: SsrDecoratorContext = {
		args,
		id: storyExport ?? 'default',
		parameters: { ...(meta?.parameters ?? {}), ...(story?.parameters ?? {}) },
	};

	for (const decorator of decorators.toReversed()) {
		if (typeof decorator !== 'function') {
			continue;
		}

		const previousRender = storyRender;
		storyRender = () => (decorator as SsrStoryDecorator)(previousRender, context);
	}

	return storyRender;
}
