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

type RuiDialogBindings = {
	open: boolean;
	alert: boolean;
};

/**
 * `<rui-dialog>` — a composition-first modal dialog shell.
 *
 * Implements the WAI-ARIA APG Dialog (Modal) pattern, and the Alert and Message
 * Dialogs pattern when `alert` is set. Compose title, body, actions, and close
 * controls with the view helpers.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/
 *
 * @element rui-dialog
 * @slot close - Optional close control (`RuiDialogClose`).
 * @slot title - Optional visible dialog title (`RuiDialogTitle`).
 * @slot - Dialog body (`RuiDialogBody`).
 * @slot actions - Optional action buttons (`RuiDialogActions`).
 * @fires rui-close - Emitted when the dialog is dismissed.
 */
@customElement('rui-dialog')
export class RuiDialog extends RadiantElement<RuiDialogBindings> {
	@prop({ type: Boolean, reflect: true, defaultValue: false }) open: boolean;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) alert: boolean;
	@prop({ type: String, defaultValue: '' }) label: string;

	@query({ ref: 'dialog' }) dialogTarget: HTMLElement;
	@query({ selector: '[data-dialog-title]' }) titleTarget: HTMLElement;
	@query({ selector: '[data-dialog-body]' }) descriptionTarget: HTMLElement;

	@event({ name: 'rui-close', bubbles: true, composed: true })
	closeEvent: EventEmitter<RuiDialogCloseDetail>;

	private readonly dialogHidden = this.$.open.map((open) => !open);
	private readonly resolvedRole = this.$.alert.map((alert) => (alert ? 'alertdialog' : 'dialog'));

	private previouslyFocused: HTMLElement | null = null;
	private titleId = `rui-dialog-title-${Math.random().toString(36).slice(2, 9)}`;
	private descriptionId = `rui-dialog-desc-${Math.random().toString(36).slice(2, 9)}`;

	override connectedCallback(): void {
		super.connectedCallback();
		queueMicrotask(() => this.syncOpenState());
	}

	@bound
	@onUpdated(['open', 'label'])
	syncOpenState(): void {
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

	override render() {
		return (
			<div class="rui-dialog" hidden={this.dialogHidden}>
				<div data-ref="backdrop" class="rui-dialog__backdrop"></div>
				<div
					data-ref="dialog"
					class="rui-dialog__surface"
					tabindex={-1}
					role={this.resolvedRole}
					aria-modal="true"
				>
					<slot name="close"></slot>
					<slot name="title"></slot>
					<slot></slot>
					<slot name="actions"></slot>
				</div>
			</div>
		);
	}
}
