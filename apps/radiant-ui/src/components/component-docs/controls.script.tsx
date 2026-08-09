import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement, onEvent } from '@ecopages/radiant';
import { type ContextProvider, consumeContext } from '@ecopages/radiant/context';
import '@ecopages/radiant-ui/button';
import '@ecopages/radiant-ui/button-group';
import '@ecopages/radiant-ui/input';
import '@ecopages/radiant-ui/number-field';
import '@ecopages/radiant-ui/select';
import '@ecopages/radiant-ui/sidebar';
import '@ecopages/radiant-ui/switch';
import '@/content/stories';
import { docsStoryContext } from '@/lib/docs-stories/story-context';
import type { DocsCanvasElement } from './canvas.script';
import type { DocsDemoElement } from './demo.script';

@customElement('radiant-docs-controls')
export class DocsControlsElement extends RadiantElement {
	@consumeContext(docsStoryContext) story?: ContextProvider<typeof docsStoryContext>;

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
		const target = this.resolveControl(event, 'rui-select[data-docs-arg]');
		const detail = (event as CustomEvent<{ value?: unknown }>).detail;
		if (!target || typeof detail?.value !== 'string') return;
		const propName = target.dataset.docsArg;
		if (!propName) return;
		this.setArg(propName, detail.value);
	}

	@onEvent({ selector: 'rui-switch[data-docs-arg]', type: 'rui-change' })
	onSwitchChange(event: Event): void {
		const target = this.resolveControl(event, 'rui-switch[data-docs-arg]');
		const detail = (event as CustomEvent<{ checked?: unknown }>).detail;
		if (!target || typeof detail?.checked !== 'boolean') return;
		const propName = target.dataset.docsArg;
		if (!propName) return;
		this.setArg(propName, detail.checked);
	}

	@onEvent({ selector: 'rui-number-field[data-docs-arg]', type: 'rui-change' })
	onNumberChange(event: Event): void {
		const target = this.resolveControl(event, 'rui-number-field[data-docs-arg]');
		const detail = (event as CustomEvent<{ value?: unknown }>).detail;
		if (!target || typeof detail?.value !== 'number' || !Number.isFinite(detail.value)) return;
		const propName = target.dataset.docsArg;
		if (!propName) return;
		this.setArg(propName, detail.value);
	}

	@onEvent({ selector: 'input[data-docs-arg]', type: 'input' })
	onTextInput(event: Event): void {
		const target = event.target;
		if (!(target instanceof HTMLInputElement)) return;
		const propName = target.dataset.docsArg;
		if (!propName) return;
		this.setArg(propName, target.value);
	}

	private resolveControl(event: Event, selector: string): HTMLElement | null {
		const target = event.target;
		if (!(target instanceof Element)) {
			return null;
		}
		return target.closest<HTMLElement>(selector);
	}

	private setArg(propName: string, value: string | boolean | number): void {
		const provider = this.story ?? this.findStoryProvider();
		if (!provider) {
			return;
		}

		const current = provider.getContext();
		const nextArgs = { ...current.args, [propName]: value };
		if (JSON.stringify(nextArgs) === JSON.stringify(current.args)) {
			return;
		}

		provider.setContext({
			args: nextArgs,
			renderRevision: current.renderRevision + 1,
		});

		if (typeof value === 'string') {
			this.syncSegmentPressed(propName, value);
		}

		this.repaintCanvas();
	}

	private findStoryProvider(): ContextProvider<typeof docsStoryContext> | undefined {
		if (this.story) {
			return this.story;
		}

		const demo = this.closest('radiant-docs-demo') as DocsDemoElement | null;
		return demo?.story;
	}

	private repaintCanvas(): void {
		this.closest('radiant-docs-demo')
			?.querySelector<DocsCanvasElement>('radiant-docs-canvas')
			?.repaintFromContext();
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
