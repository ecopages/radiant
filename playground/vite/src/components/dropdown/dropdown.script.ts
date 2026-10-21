import type { FocusableElement } from '@/types';
import { onUpdated } from '@ecopages/radiant';
import { RadiantElement } from '@ecopages/radiant/core/radiant-element';
import { bound } from '@ecopages/radiant/decorators/bound';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import { onEvent } from '@ecopages/radiant/decorators/on-event';
import { query } from '@ecopages/radiant/decorators/query';
import { prop } from '@ecopages/radiant/decorators/prop';

export type RadiantDropdownPlacement =
	| 'top'
	| 'top-start'
	| 'top-end'
	| 'right'
	| 'right-start'
	| 'right-end'
	| 'bottom'
	| 'bottom-start'
	| 'bottom-end'
	| 'left'
	| 'left-start'
	| 'left-end';

export type RadiantDropdownProps = {
	defaultOpen?: boolean;
	placement?: RadiantDropdownPlacement;
	offset?: number;
	arrow?: boolean;
};

/**
 * @element radiant-dropdown
 * @description A CSS-positioned dropdown demo for the Vite playground
 */
@customElement('radiant-dropdown')
export class RadiantDropdown extends RadiantElement {
	@query({ ref: 'trigger' }) triggerTarget!: HTMLButtonElement | null;
	@query({ ref: 'content' }) contentTarget!: HTMLElement | null;
	@query({ ref: 'arrow' }) arrowTarget!: HTMLElement | null;

	@prop({ type: Boolean, reflect: true, defaultValue: false }) defaultOpen!: boolean;
	@prop({ type: String, defaultValue: 'bottom-start', reflect: true }) placement!: RadiantDropdownPlacement;
	@prop({ type: Boolean, defaultValue: true }) focusOnOpen!: boolean;

	private didApplyDefaultOpen = false;

	protected override onConnected(): void {
		if (this.didApplyDefaultOpen) {
			return;
		}
		this.didApplyDefaultOpen = true;
		if (this.defaultOpen) this.toggleContent();
	}

	disconnectedCallback(): void {
		document.removeEventListener('click', this.closeContent);
		super.disconnectedCallback();
	}

	@bound
	@onUpdated(['placement'])
	syncPlacement(): void {
		if (this.arrowTarget) this.arrowTarget.dataset.placement = this.placement;
	}

	@onEvent({ ref: 'trigger', type: 'click' })
	toggleContent(): void {
		const trigger = this.triggerTarget;
		const content = this.contentTarget;
		if (!trigger || !content) return;
		if (typeof trigger.ariaExpanded === 'undefined') trigger.ariaExpanded = 'false';
		trigger.setAttribute('aria-expanded', String(trigger.ariaExpanded !== 'true'));
		const isOpen = trigger.ariaExpanded === 'true';
		content.hidden = !isOpen;
		this.syncPlacement();

		if (isOpen) {
			document.addEventListener('click', this.closeContent);
			this.focusOnOpenChanged();
		} else {
			document.removeEventListener('click', this.closeContent);
		}
	}

	@bound
	focusOnOpenChanged(): void {
		if (this.triggerTarget?.ariaExpanded === 'true' && this.focusOnOpen) {
			const firstFocusableElement = this.contentTarget?.querySelector(
				'a, button, input, [tabindex]:not([tabindex="-1"])',
			);
			if (firstFocusableElement) {
				(firstFocusableElement as FocusableElement).focus();
			}
		}
	}

	@bound
	closeContent(event: MouseEvent) {
		const trigger = this.triggerTarget;
		const content = this.contentTarget;
		if (!trigger || !content) return;
		if (!trigger.contains(event.target as Node) && !content.contains(event.target as Node)) {
			trigger.setAttribute('aria-expanded', 'false');
			content.hidden = true;
			document.removeEventListener('click', this.closeContent);
		}
	}
}
