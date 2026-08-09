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
	 * Server-rendered previews are already the initial story output. Repainting
	 * them during upgrade disconnects their nested custom elements and loses
	 * their hydrated state, so only empty client-created canvases paint here.
	 */
	override connectedCallback(): void {
		super.connectedCallback();
		if (!this.hasChildNodes()) {
			this.repaintFromContext();
		}
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

		const revision = this.getStoryProvider()?.getContext().renderRevision ?? 0;
		this.dataset.playgroundRevision = String(revision);
		renderJsx(renderStory(entry.meta, entry.story, args), this);
	}
}

declare module '@ecopages/jsx' {
	interface JsxCustomIntrinsicElements {
		'radiant-docs-canvas': JsxCustomElementAttributes<DocsCanvasElement> & { storyId?: string };
	}
}
