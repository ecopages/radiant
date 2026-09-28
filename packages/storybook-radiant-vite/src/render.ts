import type { Args, ArgsStoryFn, RenderContext } from 'storybook/internal/types';
import type { JsxRenderable } from '@ecopages/jsx';
import { teardownCanvas } from './canvas';
import { applyStoryArgs, getCustomElementTagName, isCustomElementConstructor } from './host';
import { mountClientResult } from './mount-client';
import { mountSsrErrorBanner, mountSsrResult } from './mount-ssr';
import type { RadiantRenderMode, RadiantRenderer, RadiantStoryParameters } from './types';

type RenderContextWithCallbacks = RenderContext<RadiantRenderer> & {
	showStoryDuringRender?: () => void;
};

function showStoryDuringRender(context: RenderContext<RadiantRenderer>): void {
	(context as RenderContextWithCallbacks).showStoryDuringRender?.();
}

function resolveRenderMode(
	parameters: RadiantStoryParameters['radiant'] | undefined,
	globals: Record<string, unknown> | undefined,
): RadiantRenderMode {
	const fromGlobal = globals?.radiantRenderMode;
	if (fromGlobal === 'client' || fromGlobal === 'ssr-hydrate' || fromGlobal === 'ssr-static') {
		return fromGlobal;
	}
	return parameters?.renderMode ?? 'client';
}

/**
 * Default CSF render: turn `component` + args into JSX, a custom element, or a host node.
 */
export const render: ArgsStoryFn<RadiantRenderer> = (args, context) => {
	const { id, component } = context;

	if (!component) {
		throw new Error(`Unable to render story ${id} as the component annotation is missing from the default export`);
	}

	if (typeof component === 'function' && !isCustomElementConstructor(component)) {
		return (component as (args: Args) => JsxRenderable | Node | string | null | undefined)(args);
	}

	if (typeof component === 'string') {
		const element = document.createElement(component);
		applyStoryArgs(element, args);
		return element;
	}

	if (isCustomElementConstructor(component)) {
		const tagName = getCustomElementTagName(component);
		if (!tagName) {
			throw new Error(
				`Unable to render story ${id}: RadiantElement constructor is missing @customElement tag metadata`,
			);
		}
		const element = document.createElement(tagName);
		applyStoryArgs(element, args);
		return element;
	}

	throw new Error(`Unable to render story ${id}: unsupported component type`);
};

/**
 * Mounts the story result into the Storybook canvas (client or SSR).
 */
export async function renderToCanvas(
	context: RenderContext<RadiantRenderer>,
	canvasElement: RadiantRenderer['canvasElement'],
): Promise<(() => void) | void> {
	const radiant = (context.storyContext.parameters as RadiantStoryParameters).radiant;
	const mode = resolveRenderMode(radiant, context.storyContext.globals as Record<string, unknown> | undefined);

	if (mode === 'ssr-hydrate' || mode === 'ssr-static') {
		try {
			await mountSsrResult(context, canvasElement, mode);
		} catch (error) {
			mountSsrErrorBanner(
				canvasElement,
				`Radiant SSR failed for "${context.name}"`,
				error instanceof Error ? error.message : String(error),
			);
		}
		return () => {
			teardownCanvas(canvasElement);
		};
	}

	const element = await Promise.resolve(context.storyFn());
	context.showMain();
	await mountClientResult({
		canvasElement,
		element,
		forceRemount: context.forceRemount,
		storyName: context.name,
		storyKind: context.kind,
		showError: context.showError,
	});
	showStoryDuringRender(context);
}
