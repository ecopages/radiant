import { onUpdated } from '@ecopages/radiant';
import { RadiantElement } from '@ecopages/radiant/core/radiant-element';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import { onEvent } from '@ecopages/radiant/decorators/on-event';
import { prop } from '@ecopages/radiant/decorators/prop';
import { applyRovingTabindex, navigateRovingTabindex } from '../../../lib/roving-tabindex';
import type { RuiDisclosureToggleDetail } from './disclosure.script';
import { RuiDisclosure } from './disclosure.script';

export type RuiDisclosureGroupProps = {
	/** Allow more than one disclosure to stay open. Default: `false` (exclusive). */
	multiple?: boolean;
	/** Animate panel height for child disclosures. Default: `false`. */
	animated?: boolean;
};

/**
 * `<rui-disclosure-group>` — coordinates stacked disclosures (accordion-style).
 *
 * When `multiple` is `false` (default), opening one disclosure closes the others.
 * Supports APG accordion keyboard navigation between triggers (ArrowUp/Down, Home/End).
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/accordion/
 * @element rui-disclosure-group
 * @slot - `rui-disclosure` children.
 */
@customElement('rui-disclosure-group')
export class RuiDisclosureGroup extends RadiantElement {
	@prop({ type: Boolean, reflect: true, defaultValue: false }) multiple: boolean;
	@prop({ type: Boolean, reflect: true, attribute: 'animated', defaultValue: false }) animated: boolean;

	override connectedCallback(): void {
		super.connectedCallback();
		this.addEventListener('rui-disclosure-toggle', this.onDisclosureToggle);
		queueMicrotask(() => {
			this.syncChildrenAnimated();
			this.syncTriggers();
		});
	}

	override disconnectedCallback(): void {
		this.removeEventListener('rui-disclosure-toggle', this.onDisclosureToggle);
		super.disconnectedCallback();
	}

	private getTriggers(): HTMLElement[] {
		return Array.from(this.querySelectorAll<HTMLElement>('[data-disclosure-trigger]'));
	}

	private syncTriggers(): void {
		const triggers = this.getTriggers();
		if (!triggers.length) {
			return;
		}

		const activeIndex = Math.max(
			0,
			triggers.findIndex((trigger) => trigger.tabIndex === 0 || trigger === document.activeElement),
		);
		applyRovingTabindex(triggers, activeIndex);
	}

	private syncChildrenAnimated(): void {
		for (const disclosure of this.querySelectorAll<RuiDisclosure>('rui-disclosure')) {
			disclosure.animated = this.animated;
		}
	}

	@onUpdated('animated')
	onAnimatedUpdated(): void {
		this.syncChildrenAnimated();
	}

	private onDisclosureToggle = (event: Event): void => {
		if (this.multiple) {
			return;
		}

		const detail = (event as CustomEvent<RuiDisclosureToggleDetail>).detail;
		if (!detail?.open) {
			return;
		}

		const source = event.target;
		if (!(source instanceof RuiDisclosure)) {
			return;
		}

		for (const disclosure of this.querySelectorAll<RuiDisclosure>('rui-disclosure')) {
			if (disclosure !== source) {
				disclosure.open = false;
			}
		}
	};

	@onEvent({ selector: '[data-disclosure-trigger]', type: 'keydown' })
	onTriggerKeydown(event: KeyboardEvent): void {
		const triggers = this.getTriggers();
		const current = (event.target as HTMLElement).closest<HTMLElement>('[data-disclosure-trigger]');
		if (!current) {
			return;
		}

		const result = navigateRovingTabindex({
			items: triggers,
			current,
			key: event.key,
			orientation: 'vertical',
			wrap: true,
		});

		if (!result.handled) {
			return;
		}

		event.preventDefault();
	}

	override render() {
		return (
			<div class="rui-disclosure-group" data-ref="root">
				<slot></slot>
			</div>
		);
	}
}
