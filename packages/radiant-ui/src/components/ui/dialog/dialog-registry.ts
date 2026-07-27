import type { RuiDialog } from './dialog.script';
import './dialog.script';
import {
	RUI_DIALOG_ACTION_EVENT,
	RUI_DIALOG_CLOSE_EVENT,
	RUI_DIALOG_HOST_ID,
	RUI_DIALOG_OPEN_EVENT,
	RUI_DIALOG_TOGGLE_EVENT,
	type DialogAction,
	type DialogActionDetail,
	type DialogCloseDetail,
	type DialogHandle,
	type DialogHostContent,
	type DialogOpenOptions,
	type DialogToggleDetail,
	isNamedDialogOpen,
} from './dialog-types';

export type InstallDialogsOptions = {
	/** Parent node for the imperative host mount. Default: `document.body`. */
	mount?: ParentNode;
};

let installed = false;
let mountParent: ParentNode | null = null;
let hostDialog: RuiDialog | null = null;
let openId: string | null = null;

function resolveDialog(id: string): RuiDialog | null {
	const trimmed = id.trim();
	if (!trimmed) {
		return null;
	}

	const byId = document.getElementById(trimmed);
	if (byId?.localName === 'rui-dialog') {
		return byId as RuiDialog;
	}

	return null;
}

function createCloseButton(): HTMLButtonElement {
	const close = document.createElement('button');
	close.slot = 'close';
	close.type = 'button';
	close.setAttribute('data-dialog-close', '');
	close.setAttribute('data-ref', 'close');
	close.className = 'rui-dialog__close';
	close.setAttribute('aria-label', 'Close');
	close.textContent = '×';
	return close;
}

function createTitle(title: string): HTMLElement {
	const el = document.createElement('div');
	el.slot = 'title';
	el.setAttribute('data-dialog-title', '');
	el.setAttribute('data-ref', 'title');
	el.className = 'rui-dialog__title';
	el.textContent = title;
	return el;
}

function createBody(body: string): HTMLElement {
	const el = document.createElement('div');
	el.setAttribute('data-dialog-body', '');
	el.setAttribute('data-ref', 'description');
	el.className = 'rui-dialog__body';
	const paragraph = document.createElement('p');
	paragraph.textContent = body;
	el.append(paragraph);
	return el;
}

function createActions(actions: DialogAction[]): HTMLElement {
	const row = document.createElement('div');
	row.slot = 'actions';
	row.className = 'rui-dialog__actions';

	for (const action of actions) {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = `rui-button rui-button--${action.variant ?? 'filled'} rui-button--${action.size ?? 'md'}`;
		button.setAttribute('data-dialog-action', action.value ?? '');
		if (action.closeOnClick === false) {
			button.setAttribute('data-dialog-action-close', 'false');
		}
		button.textContent = action.label;
		row.append(button);
	}

	return row;
}

function destroyHostDialog(): void {
	hostDialog?.remove();
	hostDialog = null;
}

function mountHostDialog(options: DialogHostContent): RuiDialog {
	destroyHostDialog();

	const dialog = document.createElement('rui-dialog') as RuiDialog;
	dialog.id = RUI_DIALOG_HOST_ID;
	dialog.alert = Boolean(options.alert);
	dialog.label = options.label ?? '';

	dialog.append(createCloseButton());
	if (options.title) {
		dialog.append(createTitle(options.title));
	}
	if (options.body) {
		dialog.append(createBody(options.body));
	}
	if (options.actions?.length) {
		dialog.append(createActions(options.actions));
	}

	(mountParent ?? document.body).appendChild(dialog);
	hostDialog = dialog;
	return dialog;
}

function closeCurrentExcept(nextId: string): void {
	if (!openId || openId === nextId) {
		return;
	}

	if (openId === RUI_DIALOG_HOST_ID) {
		destroyHostDialog();
	} else {
		const dialog = resolveDialog(openId);
		if (dialog) {
			dialog.open = false;
		}
	}
}

function openNamed(id: string): void {
	ensureInstalled();
	const dialog = resolveDialog(id);
	if (!dialog) {
		return;
	}

	closeCurrentExcept(id);
	dialog.open = true;
	openId = id;
}

function openHost(options: DialogHostContent): void {
	ensureInstalled();
	closeCurrentExcept(RUI_DIALOG_HOST_ID);
	const dialog = mountHostDialog(options);
	dialog.open = true;
	openId = RUI_DIALOG_HOST_ID;
}

/**
 * Resolve open intent: string/`id` opens a named dialog; otherwise fill the host.
 * Named dialogs own their markup — when `id` is set, host content fields are ignored.
 */
function open(idOrOptions: string | DialogOpenOptions): void {
	if (typeof idOrOptions === 'string') {
		openNamed(idOrOptions);
		return;
	}

	if (isNamedDialogOpen(idOrOptions)) {
		openNamed(idOrOptions.id);
		return;
	}

	openHost(idOrOptions);
}

function close(id?: string): void {
	ensureInstalled();
	const targetId = id ?? openId;
	if (!targetId) {
		return;
	}

	if (targetId === RUI_DIALOG_HOST_ID) {
		destroyHostDialog();
	} else {
		const dialog = resolveDialog(targetId);
		if (dialog) {
			dialog.open = false;
		}
	}

	if (openId === targetId) {
		openId = null;
	}
}

function toggle(id: string): void {
	ensureInstalled();
	if (openId === id) {
		close(id);
		return;
	}
	openNamed(id);
}

function onOpenEvent(event: Event): void {
	const detail = (event as CustomEvent<DialogOpenOptions | string>).detail;
	if (typeof detail === 'string') {
		open(detail);
		return;
	}
	if (detail && typeof detail === 'object') {
		open(detail);
	}
}

function onCloseEvent(event: Event): void {
	const detail = (event as CustomEvent<DialogCloseDetail>).detail;
	close(detail?.id);
}

function onToggleEvent(event: Event): void {
	const detail = (event as CustomEvent<DialogToggleDetail>).detail;
	if (detail?.id) {
		toggle(detail.id);
	}
}

function onDocumentClick(event: Event): void {
	const target = event.target as Element | null;
	if (!target?.closest) {
		return;
	}

	const action = target.closest('[data-dialog-action]') as HTMLElement | null;
	if (action && hostDialog?.contains(action)) {
		event.preventDefault();
		const value = action.getAttribute('data-dialog-action') || undefined;
		const detail: DialogActionDetail = { value: value || undefined };
		hostDialog.dispatchEvent(
			new CustomEvent(RUI_DIALOG_ACTION_EVENT, {
				detail,
				bubbles: true,
				composed: true,
			}),
		);
		if (action.getAttribute('data-dialog-action-close') !== 'false') {
			close(RUI_DIALOG_HOST_ID);
		}
		return;
	}

	const openTrigger = target.closest('[data-dialog-open]');
	if (openTrigger) {
		const id = openTrigger.getAttribute('data-dialog-open')?.trim();
		if (id) {
			event.preventDefault();
			openNamed(id);
		}
		return;
	}

	const closeTrigger = target.closest('[data-dialog-close]');
	if (closeTrigger) {
		const insideDialog = closeTrigger.closest('rui-dialog');
		if (insideDialog?.hasAttribute('open')) {
			return;
		}
		event.preventDefault();
		close();
	}
}

function onRuiClose(event: Event): void {
	const dialog = (event.target as Element | null)?.closest?.('rui-dialog');
	if (!dialog) {
		return;
	}

	const id = dialog.id || null;
	if (id && openId === id) {
		if (id === RUI_DIALOG_HOST_ID) {
			destroyHostDialog();
		}
		openId = null;
	}
}

/**
 * Install document listeners for dialog events and `data-dialog-*` attributes.
 * Idempotent — safe to call from app boot and Storybook decorators.
 * Returns an uninstall function for tests / HMR.
 */
export function installDialogs(options: InstallDialogsOptions = {}): () => void {
	if (installed) {
		if (options.mount) {
			mountParent = options.mount;
		}
		return uninstallDialogs;
	}

	installed = true;
	mountParent = options.mount ?? document.body;

	document.addEventListener(RUI_DIALOG_OPEN_EVENT, onOpenEvent);
	document.addEventListener(RUI_DIALOG_CLOSE_EVENT, onCloseEvent);
	document.addEventListener(RUI_DIALOG_TOGGLE_EVENT, onToggleEvent);
	document.addEventListener('click', onDocumentClick);
	document.addEventListener('rui-close', onRuiClose);

	return uninstallDialogs;
}

function ensureInstalled(): void {
	if (!installed) {
		installDialogs();
	}
}

/** Tear down listeners and the host dialog (mainly for tests). */
export function uninstallDialogs(): void {
	if (!installed) {
		return;
	}

	document.removeEventListener(RUI_DIALOG_OPEN_EVENT, onOpenEvent);
	document.removeEventListener(RUI_DIALOG_CLOSE_EVENT, onCloseEvent);
	document.removeEventListener(RUI_DIALOG_TOGGLE_EVENT, onToggleEvent);
	document.removeEventListener('click', onDocumentClick);
	document.removeEventListener('rui-close', onRuiClose);

	destroyHostDialog();
	mountParent = null;
	openId = null;
	installed = false;
}

/** Currently open dialog id, or `null`. */
export function getOpenDialogId(): string | null {
	return openId;
}

/** Open a named dialog by id, or fill/open the imperative host dialog. */
export function openDialog(idOrOptions: string | DialogOpenOptions): void {
	ensureInstalled();
	open(idOrOptions);
}

/** Close the current dialog, or a specific id. */
export function closeDialog(id?: string): void {
	ensureInstalled();
	close(id);
}

/** Toggle a named dialog by id. */
export function toggleDialog(id: string): void {
	ensureInstalled();
	toggle(id);
}

/**
 * Bound handle for a named dialog id, or the imperative host when `id` is omitted.
 * A bound handle's `open()` always targets that id; pass options only on unbound handles.
 *
 * @example
 * const confirm = createDialogHandle();
 * confirm.open({ title: 'Delete?', body: '…', actions: […] });
 *
 * const profile = createDialogHandle('edit-profile');
 * profile.open();
 */
export function createDialogHandle(id?: string): DialogHandle {
	ensureInstalled();

	const boundId = id?.trim() || undefined;

	const handleOpen = ((idOrOptions?: string | DialogHostContent) => {
		if (boundId) {
			openNamed(boundId);
			return;
		}

		if (idOrOptions == null) {
			return;
		}
		if (typeof idOrOptions === 'string') {
			openNamed(idOrOptions);
			return;
		}
		open(idOrOptions);
	}) as DialogHandle['open'];

	return {
		open: handleOpen,
		close: (closeId) => {
			close(closeId ?? boundId);
		},
		toggle: (toggleId) => {
			const target = toggleId ?? boundId;
			if (target) {
				toggle(target);
			}
		},
		get openId() {
			return openId;
		},
	};
}
