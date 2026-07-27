/** Reserved id for the registry-owned imperative host dialog. */
export const RUI_DIALOG_HOST_ID = '__rui-dialog-host';

export const RUI_DIALOG_OPEN_EVENT = 'rui-dialog-open';
export const RUI_DIALOG_CLOSE_EVENT = 'rui-dialog-close';
export const RUI_DIALOG_TOGGLE_EVENT = 'rui-dialog-toggle';
export const RUI_DIALOG_ACTION_EVENT = 'rui-dialog-action';

export type DialogActionVariant = 'primary' | 'ghost' | 'error' | 'outline' | 'filled';
export type DialogActionSize = 'sm' | 'md' | 'lg';

export type DialogAction = {
	label: string;
	variant?: DialogActionVariant;
	size?: DialogActionSize;
	/** Emitted on `rui-dialog-action` as `detail.value`. */
	value?: string;
	/** Default `true` — dismiss after click. */
	closeOnClick?: boolean;
};

/** Content for the registry-owned imperative host dialog (no `id`). */
export type DialogHostContent = {
	title?: string;
	/** Body copy (plain text). */
	body?: string;
	alert?: boolean;
	/** Accessible name when there is no title. */
	label?: string;
	actions?: DialogAction[];
};

/** Open a named dialog by id, or fill the imperative host — never both. */
export type DialogOpenOptions = { id: string } | DialogHostContent;

export type DialogOpenDetail = DialogOpenOptions | string;
export type DialogCloseDetail = { id?: string };
export type DialogToggleDetail = { id: string };
export type DialogActionDetail = { value?: string };

export type DialogHandle = {
	open: {
		(id: string): void;
		(options: DialogHostContent): void;
	};
	/** Omit `id` to close the currently open dialog. */
	close: (id?: string) => void;
	toggle: (id?: string) => void;
	readonly openId: string | null;
};

export function isNamedDialogOpen(detail: DialogOpenOptions): detail is { id: string } {
	return 'id' in detail && detail.id != null && detail.id !== '';
}
