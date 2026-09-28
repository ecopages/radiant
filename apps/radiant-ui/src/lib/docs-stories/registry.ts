import type { JsxRenderable } from '@ecopages/jsx';
import type { DocsArgs, DocsDecorator, DocsMeta, DocsMetaAny, DocsStory, DocsStoryAny } from './types';

const stories = new Map<string, { meta: DocsMetaAny; story: DocsStoryAny }>();

export function getStoryId(story: DocsStoryAny): string {
	return story.parameters.docs.id;
}

export function getRegisteredStory(id: string) {
	return stories.get(id);
}

export function getStoryArgs(meta: DocsMetaAny, story: DocsStoryAny): DocsArgs {
	return { ...meta.args, ...story.args };
}

function composeDocsStoryRender(meta: DocsMetaAny, story: DocsStoryAny, args: DocsArgs): () => JsxRenderable {
	const render = story.render ?? meta.render;
	if (!render) throw new Error('Docs stories must define a render function.');

	let storyRender = () => render(args);
	const decorators = [...(meta.decorators ?? []), ...(story.decorators ?? [])];
	const context = {
		args,
		parameters: story.parameters,
	};

	for (const decorator of decorators.toReversed()) {
		const previousRender = storyRender;
		storyRender = () => (decorator as DocsDecorator)(previousRender, context);
	}

	return storyRender;
}

export function renderStory(meta: DocsMetaAny, story: DocsStoryAny, args: DocsArgs) {
	return composeDocsStoryRender(meta, story, args)();
}

/**
 * Register a docs story for client canvas/controls lookup by `parameters.docs.id`.
 *
 * @remarks
 * Call at module scope for every story embedded in MDX so hydration can resolve it.
 */
export function docsStory<TArgs extends DocsArgs>(meta: DocsMeta<TArgs>, story: DocsStory<TArgs>): DocsStory<TArgs> {
	stories.set(story.parameters.docs.id, {
		meta: meta as DocsMetaAny,
		story: story as DocsStoryAny,
	});
	return story;
}

export function clearDocsStories(): void {
	stories.clear();
}
