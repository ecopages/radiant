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
	@query({ ref: 'trigger' }) triggerTarget!: HTMLButtonElement;
	@query({ ref: 'content' }) contentTarget!: HTMLElement;
	@query({ ref: 'arrow' }) arrowTarget!: HTMLElement;

	@prop({ type: Boolean, reflect: true, defaultValue: false }) defaultOpen!: boolean;
	@prop({ type: String, defaultValue: 'bottom-start', reflect: true }) placement!: RadiantDropdownPlacement;
	@prop({ type: Boolean, defaultValue: true }) focusOnOpen!: boolean;

	connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => {
			if (this.defaultOpen) this.toggleContent();
		});
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
		if (typeof this.triggerTarget.ariaExpanded === 'undefined') this.triggerTarget.ariaExpanded = 'false';
		this.triggerTarget.setAttribute('aria-expanded', String(this.triggerTarget.ariaExpanded !== 'true'));
		const isOpen = this.triggerTarget.ariaExpanded === 'true';
		this.contentTarget.hidden = !isOpen;
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
		if (this.triggerTarget.ariaExpanded === 'true' && this.focusOnOpen) {
			const firstFocusableElement = this.contentTarget.querySelector(
				'a, button, input, [tabindex]:not([tabindex="-1"])',
			);
			if (firstFocusableElement) {
				(firstFocusableElement as FocusableElement).focus();
			}
		}
	}

	@bound
	closeContent(event: MouseEvent) {
		if (!this.triggerTarget.contains(event.target as Node) && !this.contentTarget.contains(event.target as Node)) {
			this.triggerTarget.setAttribute('aria-expanded', 'false');
			this.contentTarget.hidden = true;
			document.removeEventListener('click', this.closeContent);
		}
	}
}
