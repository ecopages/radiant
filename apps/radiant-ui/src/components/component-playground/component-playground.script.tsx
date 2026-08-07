import './playground-stage.script';
import './playground-code.script';
import './playground-controls.script';

import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement, onEvent, onUpdated, prop } from '@ecopages/radiant';
import { type ContextProvider, provideContext } from '@ecopages/radiant/context';
import { getComponentDoc } from '@/lib/component-docs/registry';
import { resolvePlaygroundState } from '@/lib/playground';
import { emptyPlaygroundContext, playgroundContext } from './playground-context';
import { renderPlaygroundWorkbench } from './playground-shell';

/**
 * Interactive docs playground.
 *
 * @remarks
 * Live prop values live in {@link playgroundContext}. Updating that context does
 * not re-render this host, so `RuiField` / `RuiSelect` / `RuiSwitch` controls stay
 * mounted across edits. Stage and code panels subscribe via `@contextSelector`.
 * This host only re-renders when `slug` changes (new control set).
 */
@customElement('radiant-component-playground')
export class ComponentPlaygroundElement extends RadiantElement {
	@prop({ type: String, reflect: true, defaultValue: '' }) slug = '';

	@provideContext({
		context: playgroundContext,
		initialValue: emptyPlaygroundContext,
	})
	playgroundProvider!: ContextProvider<typeof playgroundContext>;

	override connectedCallback(): void {
		super.connectedCallback();
		if (!this.slug) {
			const match = window.location.pathname.match(/\/components\/([^/]+)/);
			if (match?.[1]) this.slug = match[1];
		}
		this.publishFromSlug();
	}

	@onUpdated('slug')
	onSlugChange(): void {
		this.publishFromSlug();
	}

	private publishFromSlug(): void {
		const doc = getComponentDoc(this.slug);
		if (!doc) {
			this.playgroundProvider.setContext(emptyPlaygroundContext);
			return;
		}
		this.publishScenario(doc.playground.scenarios[0]?.id);
	}

	private publishScenario(scenarioId?: string): void {
		const doc = getComponentDoc(this.slug);
		if (!doc) {
			this.playgroundProvider.setContext(emptyPlaygroundContext);
			return;
		}

		const state = resolvePlaygroundState(doc, scenarioId);
		this.playgroundProvider.setContext({
			slug: doc.slug,
			scenarioId: state.scenarioId,
			props: state.props,
			children: state.children,
			exportName: doc.exportName,
			usageExample: doc.usage.example,
			controls: state.controls,
			scenarios: doc.playground.scenarios,
		});
	}

	private getDoc() {
		return getComponentDoc(this.slug);
	}

	private patchProp(propName: string, value: unknown): void {
		const current = this.playgroundProvider.getContext();
		this.playgroundProvider.setContext({
			...current,
			props: { ...current.props, [propName]: value },
		});
	}

	private controlPropFromEvent(event: Event): string | null {
		const target = event.target;
		if (!(target instanceof Element)) return null;
		return target.closest<HTMLElement>('[data-control]')?.dataset.control ?? null;
	}

	@onEvent({ selector: 'rui-select[data-scenario]', type: 'rui-change' })
	onScenarioControl(event: Event): void {
		const detail = (event as CustomEvent<{ value: string }>).detail;
		if (typeof detail?.value !== 'string') return;
		this.publishScenario(detail.value);
	}

	@onEvent({ selector: 'rui-select[data-control]', type: 'rui-change' })
	onSelectControl(event: Event): void {
		const propName = this.controlPropFromEvent(event);
		const detail = (event as CustomEvent<{ value: string }>).detail;
		if (!propName || typeof detail?.value !== 'string') return;
		this.patchProp(propName, detail.value);
	}

	@onEvent({ selector: 'input[data-control]', type: 'input' })
	onTextControl(event: Event): void {
		const propName = this.controlPropFromEvent(event);
		const target = event.target;
		if (!propName || !(target instanceof HTMLInputElement)) return;
		this.patchProp(propName, target.type === 'number' ? Number(target.value) : target.value);
	}

	@onEvent({ selector: 'rui-switch[data-control]', type: 'rui-change' })
	onBooleanControl(event: Event): void {
		const propName = this.controlPropFromEvent(event);
		const detail = (event as CustomEvent<{ checked: boolean }>).detail;
		if (!propName || typeof detail?.checked !== 'boolean') return;
		this.patchProp(propName, detail.checked);
	}

	override render() {
		const doc = this.getDoc();
		if (!doc) {
			return (
				<section class="workbench" aria-label="Component playground">
					<p class="workbench__fallback">Unknown component playground.</p>
				</section>
			);
		}

		const state = resolvePlaygroundState(doc);
		const controlCount = doc.playground.scenarios.length > 1 ? state.controls.length + 1 : state.controls.length;

		return renderPlaygroundWorkbench({
			doc,
			stage: <radiant-playground-stage />,
			code: <radiant-playground-code />,
			controls: <radiant-playground-controls />,
			controlCount,
		});
	}
}

declare module '@ecopages/jsx' {
	interface JsxCustomIntrinsicElements {
		'radiant-component-playground': JsxCustomElementAttributes<ComponentPlaygroundElement> & {
			slug?: string;
		};
	}
}
