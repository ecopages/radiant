import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement, state } from '@ecopages/radiant';
import '@ecopages/radiant-ui';
import '@/content/stories';
import { getRegisteredStory, getStoryArgs, renderStory, type DocsArgs } from '@/lib/docs-stories';

@customElement('radiant-docs-canvas')
export class DocsCanvasElement extends RadiantElement {
	@state private args: DocsArgs = {};
	@state private renderRevision = 0;

	private get storyId(): string {
		return this.dataset.storyId ?? '';
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this.args = this.initialArgs();
		window.addEventListener('radiant-docs-args', this.onArgsChange);
	}

	override disconnectedCallback(): void {
		window.removeEventListener('radiant-docs-args', this.onArgsChange);
		super.disconnectedCallback();
	}

	private readonly onArgsChange = (event: Event) => {
		const detail = (event as CustomEvent<{ storyId: string; args: DocsArgs }>).detail;
		if (detail?.storyId !== this.storyId) return;
		this.applyArgs(detail.args);
	};

	private initialArgs(): DocsArgs {
		const entry = getRegisteredStory(this.storyId);
		return entry ? getStoryArgs(entry.meta, entry.story) : {};
	}

	updateArgs(args: DocsArgs): void {
		this.applyArgs(args);
	}

	/**
	 * @remarks
	 * Controls update args on the client. Re-key the story mount so slot-projected
	 * Radiant children (for example `rui-listbox` options) are recreated instead of
	 * reconciled into an empty shell.
	 */
	private applyArgs(args: DocsArgs): void {
		const nextArgs = JSON.stringify(args);
		const currentArgs = JSON.stringify(this.args);
		if (nextArgs === currentArgs && this.renderRevision > 0) {
			return;
		}

		this.args = args;
		this.renderRevision += 1;
		this.requestUpdate();
	}

	override render() {
		const entry = getRegisteredStory(this.storyId);
		if (!entry) return <p>Unknown documentation story.</p>;

		const story = renderStory(entry.meta, entry.story, this.args);
		if (this.renderRevision === 0) {
			return story;
		}

		return [
			<div data-docs-story-mount key={String(this.renderRevision)}>
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
