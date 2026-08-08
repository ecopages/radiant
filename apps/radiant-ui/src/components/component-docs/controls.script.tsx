import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement, onEvent } from '@ecopages/radiant';
import { type ContextProvider, consumeContext, contextSelector } from '@ecopages/radiant/context';
import '@ecopages/radiant-ui/button';
import '@ecopages/radiant-ui/button-group';
import '@ecopages/radiant-ui/input';
import '@ecopages/radiant-ui/select';
import '@ecopages/radiant-ui/switch';
import '@/content/stories';
import { docsStoryContext } from '@/lib/docs-stories/story-context';
import type { DocsArgs } from '@/lib/docs-stories';

@customElement('radiant-docs-controls')
export class DocsControlsElement extends RadiantElement {
	@consumeContext(docsStoryContext) story?: ContextProvider<typeof docsStoryContext>;

	@contextSelector({ context: docsStoryContext, select: (ctx) => ctx.args })
	args: DocsArgs = {};

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
		if (!this.story) {
			return;
		}

		const current = this.story.getContext();
		const nextArgs = { ...current.args, [propName]: value };
		if (JSON.stringify(nextArgs) === JSON.stringify(current.args)) {
			return;
		}

		this.story.setContext({
			args: nextArgs,
			renderRevision: current.renderRevision + 1,
		});

		if (typeof value === 'string') {
			this.syncSegmentPressed(propName, value);
		}
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
