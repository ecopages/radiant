import type {
	NamedOrDefaultProjectAnnotations,
	NormalizedProjectAnnotations,
	ProjectAnnotations,
	Store_CSFExports,
	ComposedStoryFn,
	Args,
} from 'storybook/internal/types';
import {
	composeStories as originalComposeStories,
	composeStory as originalComposeStory,
	setProjectAnnotations as originalSetProjectAnnotations,
	setDefaultProjectAnnotations,
} from 'storybook/preview-api';
import { render, renderToCanvas } from './render';
import * as previewAnnotations from './preview';
import type { RadiantRenderer, Meta, Preview, StoryFn, StoryObj, Decorator } from './types';

/**
 * Default annotations registered for portable stories / Vitest.
 * Importing this package applies them via `setDefaultProjectAnnotations`.
 */
const DEFAULT_ANNOTATIONS: ProjectAnnotations<RadiantRenderer> = {
	...previewAnnotations,
	render,
	renderToCanvas,
};

setDefaultProjectAnnotations(DEFAULT_ANNOTATIONS);

/**
 * Apply project annotations for Vitest / portable stories.
 *
 * Storybook's generic `compose*` helpers are not fully parameterized for custom
 * renderers; casts here are intentional boundary adapters, not type erasure of your CSF.
 */
export function setProjectAnnotations(
	projectAnnotations:
		NamedOrDefaultProjectAnnotations<RadiantRenderer> | NamedOrDefaultProjectAnnotations<RadiantRenderer>[],
): NormalizedProjectAnnotations<RadiantRenderer> {
	return originalSetProjectAnnotations(projectAnnotations as never) as NormalizedProjectAnnotations<RadiantRenderer>;
}

export function composeStory<TArgs extends Args = Args>(
	story: unknown,
	componentAnnotations: Meta<TArgs>,
	projectAnnotations?: ProjectAnnotations<RadiantRenderer>,
	exportsName?: string,
): ComposedStoryFn<RadiantRenderer, Partial<TArgs>> {
	return originalComposeStory(
		story as never,
		componentAnnotations as never,
		(projectAnnotations ?? DEFAULT_ANNOTATIONS) as never,
		DEFAULT_ANNOTATIONS as never,
		exportsName,
	) as ComposedStoryFn<RadiantRenderer, Partial<TArgs>>;
}

export function composeStories<TModule extends Store_CSFExports<RadiantRenderer, any>>(
	csfExports: TModule,
	projectAnnotations?: ProjectAnnotations<RadiantRenderer>,
) {
	return originalComposeStories(csfExports as never, (projectAnnotations ?? DEFAULT_ANNOTATIONS) as never);
}

/**
 * Identity helper matching Storybook framework conventions.
 * Prefer `satisfies Preview` or `const preview: Preview = { ... }` when you do not need the helper.
 */
export function definePreview(input: ProjectAnnotations<RadiantRenderer>): Preview {
	return input;
}

export { render, renderToCanvas };
export { defineRadiantComponent } from './define-component';
export { radiantSsr } from './radiant-ssr';
export type { RadiantViewComponent } from './resolve-ssr';
export type { Meta, Preview, StoryFn, StoryObj, Decorator, RadiantRenderer };
export type {
	RadiantRenderMode,
	RadiantSsrHost,
	RadiantStoryParameters,
	RadiantAuthoredParameters,
	FrameworkOptions,
	StorybookConfig,
} from './types';
