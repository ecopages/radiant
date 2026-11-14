import type { JSX_PROPS } from '@ecopages/jsx';
import { RadiantElement, customElement, onEvent, onUpdated, prop } from '@ecopages/radiant';
import { createRovingController, type RovingController } from '../../../controllers/roving-controller';
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
 * The custom element is a behavior host: it does not render disclosure markup.
 * Place `rui-disclosure` children that each implement the disclosure contract.
 *
 * When `multiple` is `false` (default), opening one disclosure closes the others.
 * Supports APG accordion keyboard navigation between triggers.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `rui-disclosure` — one disclosure per section. Host listens for
 *   `rui-disclosure-toggle` and propagates `animated` to each child.
 * - `[data-disclosure-trigger]` — inside each `rui-disclosure`. Host applies
 *   roving `tabIndex` across all triggers in the group.
 *
 * Do not fight `open` on child disclosures when `multiple` is `false` — the
 * host closes siblings when one opens.
 *
 * Nested hosts:
 * - `rui-disclosure` — each child owns `[data-disclosure-trigger]` and
 *   `[data-disclosure-panel]`; see `rui-disclosure` CE TSDoc.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/accordion/
 * @element rui-disclosure-group
 * @attr {boolean} multiple - Allow more than one disclosure to stay open. Default: `false` (exclusive).
 * @attr {boolean} animated - Animate panel height for child disclosures. Default: `false`.
 */
@customElement('rui-disclosure-group')
export class RuiDisclosureGroup extends RadiantElement {
	declare readonly [JSX_PROPS]?: RuiDisclosureGroupProps;

	@prop({ type: Boolean, reflect: true, defaultValue: false }) multiple: boolean;
	@prop({ type: Boolean, reflect: true, attribute: 'animated', defaultValue: false }) animated: boolean;

	private readonly roving: RovingController;

	constructor() {
		super();
		this.roving = createRovingController(this, {
			getItems: () => this.getTriggers(),
			getTarget: (): HTMLElement => this,
			orientation: 'vertical',
		});
	}

	protected override onConnected(): void {
		this.syncChildrenAnimated();
		this.syncTriggers();
	}

	private getTriggers(): HTMLElement[] {
		return Array.from(this.querySelectorAll<HTMLElement>('[data-disclosure-trigger]'));
	}

	private getDisclosureForTrigger(trigger: HTMLElement): RuiDisclosure | null {
		return trigger.closest('rui-disclosure');
	}

	private syncTriggers(): void {
		this.roving.sync();
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

	@onEvent({ selector: 'rui-disclosure', type: 'rui-disclosure-toggle' })
	onDisclosureToggle(event: Event): void {
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
	}

	/**
	 * @remarks Optional APG accordion: ArrowLeft collapses, ArrowRight expands the focused header.
	 */
	@onEvent({ selector: '[data-disclosure-trigger]', type: 'keydown' })
	onTriggerKeydown(event: KeyboardEvent): void {
		const current = (event.target as HTMLElement).closest<HTMLElement>('[data-disclosure-trigger]');
		if (!current) {
			return;
		}

		if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
			return;
		}

		const disclosure = this.getDisclosureForTrigger(current);
		if (!disclosure) {
			return;
		}

		event.preventDefault();
		const nextOpen = event.key === 'ArrowRight';
		if (disclosure.open === nextOpen) {
			return;
		}

		disclosure.open = nextOpen;
		if (nextOpen && !this.multiple) {
			for (const other of this.querySelectorAll<RuiDisclosure>('rui-disclosure')) {
				if (other !== disclosure) {
					other.open = false;
				}
			}
		}
	}
}

declare global {
	interface HTMLElementTagNameMap {
		'rui-disclosure-group': RuiDisclosureGroup;
	}
}
