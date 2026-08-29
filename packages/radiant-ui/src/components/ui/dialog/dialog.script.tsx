import { RadiantElement, bound, customElement, event, onEvent, onUpdated, prop, query } from '@ecopages/radiant';
import type { EventEmitter } from '@ecopages/radiant/tools/event-emitter';
import { queryFocusableCandidates } from '@/lib/focusable-elements';

export type RuiDialogProps = {
	/** Whether the dialog is open. Default: `false`. */
	open?: boolean;
	/**
	 * When `true`, uses `role="alertdialog"` for workflow-interrupting
	 * confirmations. Default: `false` (`role="dialog"`).
	 */
	alert?: boolean;
	/** Accessible name when there is no visible title. */
	label?: string;
};

export type RuiDialogCloseDetail = {
	reason: 'escape' | 'backdrop' | 'dismiss';
};

/**
 * `<rui-dialog>` — modal dialog behavior: focus trap, dismiss, and accessible naming.
 *
 * The custom element is a behavior host: it does not render the composed tree.
 * Import the script and place light-DOM children that match the contract below,
 * or use the `RuiDialog` view helpers which stamp the same targets.
 *
 * Implements the WAI-ARIA APG Dialog (Modal) pattern, and the Alert and Message
 * Dialogs pattern when `alert` is set.
 *
 * ## Light-DOM contract
 *
 * Required:
 * - `[data-ref="root"]` — dialog chrome wrapper. Host toggles `hidden` when `open` is false.
 * - `[data-ref="backdrop"]` — scrim behind the surface. Click dismisses (`rui-close` reason `backdrop`).
 * - `[data-ref="dialog"]` — modal panel. Host sets `aria-labelledby` (from title),
 *   `aria-label` (from `label` when there is no title), and `aria-describedby` (from body).
 *   The view seeds `role="dialog"` or `role="alertdialog"`, `aria-modal="true"`, and `tabIndex="-1"`.
 *
 * Optional:
 * - `[data-dialog-title]` — visible name. Host assigns `id` and wires `aria-labelledby` when text is present.
 * - `[data-dialog-body]` — supplementary description. Host assigns `id` and wires `aria-describedby`.
 * - `[data-dialog-close]` — dismiss control. Click emits `rui-close` with reason `dismiss`.
 *
 * Provide either `[data-dialog-title]` with text or the `label` attribute for an accessible name.
 * Do not fight host-owned `aria-labelledby`, `aria-label`, `aria-describedby`, or `hidden` on `[data-ref="root"]`.
 *
 * Nested hosts: none.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/
 *
 * @element rui-dialog
 * @attr {boolean} open - Whether the dialog is open. Default: `false`.
 * @attr {boolean} alert - Uses `role="alertdialog"` for workflow-interrupting confirmations. Default: `false`.
 * @attr {string} label - Accessible name when there is no visible title.
 * @fires rui-close - Emitted when the dialog is dismissed; `detail.reason` is `escape`, `backdrop`, or `dismiss`.
 *
 * @remarks
 * Minimum tree: `[data-ref="root"]` > backdrop + `[data-ref="dialog"]` with optional title, body, and close.
 * BEM classes live on the view `DialogShell` and helpers; the host never queries them.
 */
@customElement('rui-dialog')
export class RuiDialog extends RadiantElement {
	@prop({ type: Boolean, reflect: true, defaultValue: false }) open: boolean;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) alert: boolean;
	@prop({ type: String, defaultValue: '' }) label: string;

	@query({ ref: 'root' }) rootTarget: HTMLElement;
	@query({ ref: 'dialog' }) dialogTarget: HTMLElement;
	@query({ selector: '[data-dialog-title]' }) titleTarget: HTMLElement;
	@query({ selector: '[data-dialog-body]' }) descriptionTarget: HTMLElement;

	@event({ name: 'rui-close', bubbles: true, composed: true })
	closeEvent: EventEmitter<RuiDialogCloseDetail>;

	private previouslyFocused: HTMLElement | null = null;
	private titleId = `rui-dialog-title-${Math.random().toString(36).slice(2, 9)}`;
	private descriptionId = `rui-dialog-desc-${Math.random().toString(36).slice(2, 9)}`;

	protected override onConnected(): void {
		this.syncOpenState();
	}

	@bound
	@onUpdated(['open', 'label'])
	syncOpenState(): void {
		this.rootTarget?.toggleAttribute('hidden', !this.open);

		if (!this.dialogTarget) {
			return;
		}

		if (this.titleTarget?.textContent?.trim()) {
			this.titleTarget.id = this.titleId;
			this.dialogTarget.setAttribute('aria-labelledby', this.titleId);
			this.dialogTarget.removeAttribute('aria-label');
		} else if (this.label) {
			this.dialogTarget.setAttribute('aria-label', this.label);
			this.dialogTarget.removeAttribute('aria-labelledby');
		}

		if (this.descriptionTarget) {
			this.descriptionTarget.id = this.descriptionId;
			this.dialogTarget.setAttribute('aria-describedby', this.descriptionId);
		} else {
			this.dialogTarget.removeAttribute('aria-describedby');
		}

		if (this.open) {
			this.previouslyFocused = document.activeElement as HTMLElement | null;
			queueMicrotask(() => this.focusInitial());
		} else {
			this.previouslyFocused?.focus?.();
			this.previouslyFocused = null;
		}
	}

	private focusInitial(): void {
		const focusable = this.getFocusable();
		(focusable[0] ?? this.dialogTarget)?.focus();
	}

	private getFocusable(): HTMLElement[] {
		return this.dialogTarget ? queryFocusableCandidates(this.dialogTarget) : [];
	}

	private dismiss(reason: RuiDialogCloseDetail['reason']): void {
		if (!this.open) {
			return;
		}

		this.open = false;
		this.closeEvent.emit({ reason });
	}

	@onEvent({ document: true, type: 'keydown' })
	onDocumentKeydown(event: KeyboardEvent): void {
		if (!this.open) {
			return;
		}

		if (event.key === 'Escape') {
			event.preventDefault();
			this.dismiss('escape');
			return;
		}

		if (event.key !== 'Tab') {
			return;
		}

		const focusable = this.getFocusable();
		if (!focusable.length) {
			event.preventDefault();
			this.dialogTarget.focus();
			return;
		}

		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		const active = document.activeElement as HTMLElement | null;

		if (event.shiftKey && active === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && active === last) {
			event.preventDefault();
			first.focus();
		}
	}

	@onEvent({ ref: 'backdrop', type: 'click' })
	onBackdropClick(): void {
		this.dismiss('backdrop');
	}

	@onEvent({ selector: '[data-dialog-close]', type: 'click' })
	onCloseClick(): void {
		this.dismiss('dismiss');
	}
}
