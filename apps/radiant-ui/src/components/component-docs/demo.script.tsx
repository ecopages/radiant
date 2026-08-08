import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement, registerSsrPreparationCallback } from '@ecopages/radiant';
import { type ContextProvider, provideContext } from '@ecopages/radiant/context';
import '@/content/stories';
import { docsStoryContext } from '@/lib/docs-stories/story-context';
import { getRegisteredStory, getStoryArgs } from '@/lib/docs-stories';

@customElement('radiant-docs-demo')
export class DocsDemoElement extends RadiantElement {
	@provideContext<typeof docsStoryContext>({
		context: docsStoryContext,
		initialValue: { storyId: '', args: {}, renderRevision: 0 },
		hydrate: Object,
	})
	story!: ContextProvider<typeof docsStoryContext>;

	constructor() {
		super();
		registerSsrPreparationCallback(this, () => {
			this.syncStoryContext();
		});
	}

	private get storyId(): string {
		return this.dataset.storyId ?? '';
	}

	private syncStoryContext(): void {
		if (!this.storyId) {
			return;
		}

		const entry = getRegisteredStory(this.storyId);
		this.story.setContext({
			storyId: this.storyId,
			args: entry ? getStoryArgs(entry.meta, entry.story) : {},
			renderRevision: 0,
		});
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this.syncStoryContext();
	}
}

declare module '@ecopages/jsx' {
	interface JsxCustomIntrinsicElements {
		'radiant-docs-demo': JsxCustomElementAttributes<DocsDemoElement> & { storyId?: string };
	}
}
