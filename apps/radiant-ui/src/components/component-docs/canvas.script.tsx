import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { render as renderJsx } from '@ecopages/jsx';
import { RadiantElement, customElement } from '@ecopages/radiant';
import { type ContextProvider, consumeContext } from '@ecopages/radiant/context';
import '@ecopages/radiant-ui';
import '@/content/stories';
import { docsStoryContext } from '@/lib/docs-stories/story-context';
import { getRegisteredStory, renderStory } from '@/lib/docs-stories';
import type { DocsDemoElement } from './demo.script';

@customElement('radiant-docs-canvas')
export class DocsCanvasElement extends RadiantElement {
	@consumeContext(docsStoryContext) story?: ContextProvider<typeof docsStoryContext>;

	private unsubscribeStory?: () => void;

	private get storyId(): string {
		return this.getStoryProvider()?.getContext().storyId || this.dataset.storyId || '';
	}

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => this.bindStoryContext());
	}

	override disconnectedCallback(): void {
		this.unsubscribeStory?.();
		this.unsubscribeStory = undefined;
		super.disconnectedCallback();
	}

	/** Re-renders the story preview from the current shared args. */
	repaintFromContext(): void {
		const args = this.getStoryProvider()?.getContext().args;
		if (!args) {
			return;
		}

		this.paintStory(args);
	}

	private getStoryProvider(): ContextProvider<typeof docsStoryContext> | undefined {
		if (this.story) {
			return this.story;
		}

		const demo = this.closest('radiant-docs-demo') as DocsDemoElement | null;
		return demo?.story;
	}

	private bindStoryContext(attempt = 0): void {
		const provider = this.getStoryProvider();
		if (!provider) {
			if (attempt < 5) {
				queueMicrotask(() => this.bindStoryContext(attempt + 1));
			}
			return;
		}

		this.unsubscribeStory?.();
		this.repaintFromContext();
		this.unsubscribeStory = provider.subscribe({
			select: (ctx) => ctx.renderRevision,
			callback: () => {
				this.repaintFromContext();
			},
		});
	}

	private paintStory(args: Record<string, unknown>): void {
		const entry = getRegisteredStory(this.storyId);
		if (!entry) {
			return;
		}

		renderJsx(renderStory(entry.meta, entry.story, args), this);
	}
}

declare module '@ecopages/jsx' {
	interface JsxCustomIntrinsicElements {
		'radiant-docs-canvas': JsxCustomElementAttributes<DocsCanvasElement> & { storyId?: string };
	}
}
