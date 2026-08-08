import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { render as renderJsx } from '@ecopages/jsx';
import { RadiantElement, customElement } from '@ecopages/radiant';
import { type ContextProvider, consumeContext } from '@ecopages/radiant/context';
import '@ecopages/radiant-ui';
import '@/content/stories';
import { docsStoryContext } from '@/lib/docs-stories/story-context';
import { getRegisteredStory, getStoryArgs, renderStory } from '@/lib/docs-stories';
import type { DocsDemoElement } from './demo.script';

@customElement('radiant-docs-canvas')
export class DocsCanvasElement extends RadiantElement {
	@consumeContext(docsStoryContext) story?: ContextProvider<typeof docsStoryContext>;

	private unsubscribeStory?: () => void;
	private bindAttempts = 0;

	private get storyId(): string {
		return this.getStoryProvider()?.getContext().storyId || this.dataset.storyId || '';
	}

	/**
	 * @remarks
	 * Paint immediately from `data-story-id` so SSR markup is replaced even if
	 * the parent demo context is not ready yet. Then attach to the context
	 * provider when it appears (for control-driven re-paints).
	 */
	override connectedCallback(): void {
		super.connectedCallback();
		this.repaintFromContext();
		this.bindStoryContext();
	}

	override disconnectedCallback(): void {
		this.unsubscribeStory?.();
		this.unsubscribeStory = undefined;
		super.disconnectedCallback();
	}

	/** Re-renders the story preview from the current shared args. */
	repaintFromContext(): void {
		const entry = getRegisteredStory(this.storyId);
		if (!entry) return;

		const contextArgs = this.getStoryProvider()?.getContext().args;
		const args =
			contextArgs && Object.keys(contextArgs).length > 0 ? contextArgs : getStoryArgs(entry.meta, entry.story);

		this.paintStory(args);
	}

	private getStoryProvider(): ContextProvider<typeof docsStoryContext> | undefined {
		if (this.story) {
			return this.story;
		}

		const demo = this.closest('radiant-docs-demo') as DocsDemoElement | null;
		return demo?.story;
	}

	private bindStoryContext(): void {
		const provider = this.getStoryProvider();
		if (!provider) {
			if (this.bindAttempts < 30) {
				this.bindAttempts += 1;
				requestAnimationFrame(() => this.bindStoryContext());
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
