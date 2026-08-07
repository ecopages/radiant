import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement, onEvent, state } from '@ecopages/radiant';
import '@ecopages/radiant-ui/button';
import '@ecopages/radiant-ui/button-group';
import '@ecopages/radiant-ui/input';
import '@ecopages/radiant-ui/select';
import '@ecopages/radiant-ui/switch';
import '@/content/stories';
import type { DocsCanvasElement } from './canvas.script';
import type { DocsArgs } from '@/lib/docs-stories';
import { getRegisteredStory, getStoryArgs } from '@/lib/docs-stories';

@customElement('radiant-docs-controls')
export class DocsControlsElement extends RadiantElement {
	@state private args: DocsArgs = {};

	private get storyId(): string {
		return this.dataset.storyId ?? '';
	}

	override connectedCallback(): void {
		super.connectedCallback();
		const entry = getRegisteredStory(this.storyId);
		this.args = entry ? getStoryArgs(entry.meta, entry.story) : {};
	}

	@onEvent({ selector: 'button[data-docs-arg]', type: 'click' })
	onSegmentClick(event: Event): void {
		const target = event.target;
		if (!(target instanceof Node)) return;
		const el = target instanceof Element ? target : target.parentElement;
		const button = el?.closest<HTMLButtonElement>('button[data-docs-arg]');
		const propName = button?.dataset.docsArg;
		const value = button?.dataset.docsArgValue;
		if (!propName || value == null) return;
		this.setArg(propName, value);
	}

	@onEvent({ selector: 'rui-select[data-docs-arg]', type: 'rui-change' })
	onSelectChange(event: Event): void {
		const target = event.target;
		const detail = (event as CustomEvent<{ value?: unknown }>).detail;
		if (!(target instanceof HTMLElement) || typeof detail?.value !== 'string') return;
		const propName = target.dataset.docsArg;
		if (!propName) return;
		this.setArg(propName, detail.value);
	}

	@onEvent({ selector: 'rui-switch[data-docs-arg]', type: 'rui-change' })
	onSwitchChange(event: Event): void {
		const target = event.target;
		const detail = (event as CustomEvent<{ checked?: unknown }>).detail;
		if (!(target instanceof HTMLElement) || typeof detail?.checked !== 'boolean') return;
		const propName = target.dataset.docsArg;
		if (!propName) return;
		this.setArg(propName, detail.checked);
	}

	@onEvent({ selector: 'input[data-docs-arg]', type: 'input' })
	onTextInput(event: Event): void {
		const target = event.target;
		if (!(target instanceof HTMLInputElement)) return;
		const propName = target.dataset.docsArg;
		if (!propName) return;
		this.setArg(propName, target.value);
	}

	private setArg(propName: string, value: string | boolean): void {
		const entry = getRegisteredStory(this.storyId);
		if (!entry) return;
		this.args = { ...this.args, [propName]: value };
		if (typeof value === 'string') this.syncSegmentPressed(propName, value);
		document.querySelectorAll<DocsCanvasElement>('radiant-docs-canvas[data-story-id]').forEach((canvas) => {
			if (canvas.dataset.storyId === this.storyId) canvas.updateArgs(this.args);
		});
		window.dispatchEvent(
			new CustomEvent('radiant-docs-args', { detail: { storyId: this.storyId, args: this.args } }),
		);
	}

	private syncSegmentPressed(propName: string, value: string): void {
		this.querySelectorAll<HTMLButtonElement>(`button[data-docs-arg="${propName}"]`).forEach((button) => {
			button.setAttribute('aria-pressed', String(button.dataset.docsArgValue === value));
		});
	}
}

declare module '@ecopages/jsx' {
	interface JsxCustomIntrinsicElements {
		'radiant-docs-controls': JsxCustomElementAttributes<DocsControlsElement> & { storyId?: string };
	}
}
