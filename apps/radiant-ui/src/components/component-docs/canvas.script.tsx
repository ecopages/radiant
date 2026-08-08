import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement } from '@ecopages/radiant';
import { type ContextProvider, consumeContext, contextSelector } from '@ecopages/radiant/context';
import '@ecopages/radiant-ui';
import '@/content/stories';
import { docsStoryContext } from '@/lib/docs-stories/story-context';
import type { DocsStoryContextValue } from '@/lib/docs-stories/story-context';
import { getRegisteredStory, getStoryArgs, renderStory, type DocsArgs } from '@/lib/docs-stories';

@customElement('radiant-docs-canvas')
export class DocsCanvasElement extends RadiantElement {
	@consumeContext(docsStoryContext) story?: ContextProvider<typeof docsStoryContext>;

	@contextSelector({ context: docsStoryContext, select: (ctx) => ctx.args })
	args: DocsArgs = {};

	@contextSelector({ context: docsStoryContext, select: (ctx) => ctx.renderRevision })
	renderRevision = 0;

	private resolveStoryContext(): DocsStoryContextValue {
		const storyId = this.dataset.storyId ?? '';
		const entry = storyId ? getRegisteredStory(storyId) : undefined;
		const fallback: DocsStoryContextValue = {
			storyId,
			args: entry ? getStoryArgs(entry.meta, entry.story) : {},
			renderRevision: 0,
		};

		if (!this.story) {
			return fallback;
		}

		const current = this.story.getContext();
		return {
			storyId: current.storyId || storyId,
			args: current.storyId ? current.args : fallback.args,
			renderRevision: current.renderRevision,
		};
	}

	override render() {
		const { storyId, args, renderRevision } = this.resolveStoryContext();
		const entry = getRegisteredStory(storyId);
		if (!entry) return <p>Unknown documentation story.</p>;

		const story = renderStory(entry.meta, entry.story, args);
		if (renderRevision === 0) {
			return story;
		}

		return [
			<div data-docs-story-mount key={String(renderRevision)}>
				{story}
			</div>,
		];
	}
}

declare module '@ecopages/jsx' {
	interface JsxCustomIntrinsicElements {
		'radiant-docs-canvas': JsxCustomElementAttributes<DocsCanvasElement> & { storyId?: string };
	}
}
