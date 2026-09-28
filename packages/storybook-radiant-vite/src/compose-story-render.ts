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
	const render = resolveStoryRender(meta, story, storyExport);
	return applyDecorators(
		createStoryRender(render, args),
		getDecorators(meta, story),
		createDecoratorContext(meta, story, storyExport, args),
	);
}

function resolveStoryRender(
	meta: SsrStoryDefinition | undefined,
	story: SsrStoryDefinition | undefined,
	storyExport: string | undefined,
): (args: Record<string, unknown>) => JsxRenderable {
	const render = story?.render ?? meta?.render ?? meta?.component;
	if (typeof render !== 'function')
		throw new Error(`Story "${storyExport ?? 'default'}" does not provide a JSX render function.`);
	return render as (args: Record<string, unknown>) => JsxRenderable;
}

function createStoryRender(
	render: (args: Record<string, unknown>) => JsxRenderable,
	args: Record<string, unknown>,
): () => JsxRenderable {
	return () => render(args);
}

function getDecorators(meta: SsrStoryDefinition | undefined, story: SsrStoryDefinition | undefined): unknown[] {
	return [...(meta?.decorators ?? []), ...(story?.decorators ?? [])];
}

function createDecoratorContext(
	meta: SsrStoryDefinition | undefined,
	story: SsrStoryDefinition | undefined,
	storyExport: string | undefined,
	args: Record<string, unknown>,
): SsrDecoratorContext {
	return {
		args,
		id: storyExport ?? 'default',
		parameters: { ...(meta?.parameters ?? {}), ...(story?.parameters ?? {}) },
	};
}

function applyDecorators(
	storyRender: () => JsxRenderable,
	decorators: unknown[],
	context: SsrDecoratorContext,
): () => JsxRenderable {
	return decorators.toReversed().reduce<() => JsxRenderable>((render, decorator) => {
		return typeof decorator === 'function' ? () => (decorator as SsrStoryDecorator)(render, context) : render;
	}, storyRender);
}
