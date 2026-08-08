import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement, onEvent } from '@ecopages/radiant';
import { type ContextProvider, consumeContext, onContextUpdate } from '@ecopages/radiant/context';
import '@/content/stories';
import { docsStoryContext } from '@/lib/docs-stories/story-context';
import { getRegisteredStory, resolveExampleCode, type DocsArgs } from '@/lib/docs-stories';
import { highlightExampleCode } from '@/lib/docs-stories/highlight-code';

@customElement('radiant-docs-code')
export class DocsCodeElement extends RadiantElement {
	@consumeContext(docsStoryContext) story?: ContextProvider<typeof docsStoryContext>;

	private get storyId(): string {
		return this.story?.getContext().storyId || this.dataset.storyId || '';
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this.refreshHighlight();
	}

	@onContextUpdate({ context: docsStoryContext, select: (ctx) => ctx.args })
	onArgsChange(_args: DocsArgs): void {
		this.refreshHighlight();
	}

	private getCode(): string {
		const entry = getRegisteredStory(this.storyId);
		if (!entry) return '';
		const args = this.story?.getContext().args ?? {};
		return resolveExampleCode(entry.meta, args);
	}

	private refreshHighlight(): void {
		const container = this.querySelector('[data-docs-code-highlight]');
		if (!container) return;
		const code = this.getCode();
		if (!code) return;

		const highlighted = highlightExampleCode(code);
		container.innerHTML = `<figure data-rehype-pretty-code-figure class="docs-story-code__figure">${highlighted}</figure>`;
	}

	@onEvent({ selector: '[data-docs-copy]', type: 'click' })
	async onCopy(event: Event): Promise<void> {
		const button = (event.target as Element | null)?.closest<HTMLElement>('[data-docs-copy]');
		try {
			await navigator.clipboard.writeText(this.getCode());
			if (!button) return;
			const original = button.textContent ?? 'Copy';
			button.textContent = 'Copied';
			button.setAttribute('aria-label', 'Copied');
			window.setTimeout(() => {
				button.textContent = original;
				button.setAttribute('aria-label', 'Copy example');
			}, 1600);
		} catch {
			button?.setAttribute('aria-label', 'Copy example');
		}
	}
}

declare module '@ecopages/jsx' {
	interface JsxCustomIntrinsicElements {
		'radiant-docs-code': JsxCustomElementAttributes<DocsCodeElement> & { storyId?: string };
	}
}
