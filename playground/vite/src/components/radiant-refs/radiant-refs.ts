import type { JSX_PROPS } from '@ecopages/jsx';
import { RadiantElement, customElement, onEvent, ref, refAll } from '@ecopages/radiant';

@customElement('radiant-refs')
export class RadiantRefs extends RadiantElement {
	declare readonly [JSX_PROPS]?: Record<never, never>;
	@ref('container') refContainer!: HTMLDivElement | null;
	@ref('count') countTarget!: HTMLDivElement | null;
	@refAll('item') itemTargets!: HTMLDivElement[];

	renderCount() {
		if (this.countTarget) this.countTarget.textContent = `${this.itemTargets.length}`;
	}

	override connectedCallback() {
		super.connectedCallback();
		this.renderCount();
	}

	@onEvent({ ref: 'create', type: 'click' })
	createRef() {
		if (!this.refContainer) return;
		this.renderTemplate({
			target: this.refContainer,
			template: `
        <div class="bg-background cursor-pointer p-2" data-ref="item">
          Ref Item
        </div>
      `,
			insert: this.itemTargets.length ? 'beforeend' : 'replace',
		});

		this.renderCount();
	}

	@onEvent({ ref: 'item', type: 'click' })
	deleteRef(event: Event) {
		(event.target as HTMLDivElement).remove();
		this.renderCount();
	}

	@onEvent({ ref: 'reset', type: 'click' })
	resetRefs() {
		for (const refItem of this.itemTargets) {
			refItem.remove();
		}

		if (this.refContainer) {
			this.renderTemplate({
				target: this.refContainer,
				template: '<div class="text-center">No Refs</div>',
				insert: 'replace',
			});
		}

		this.renderCount();
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'radiant-refs': RadiantRefs;
	}
}
