export const RUI_TOAST_SHOW_EVENT = 'rui-toast-show';
export const RUI_TOAST_DISMISS_EVENT = 'rui-toast-dismiss';

export type ToastVariant = 'default' | 'info' | 'success' | 'warning' | 'error' | 'loading';

export type ToastPosition = 'top-start' | 'top-center' | 'top-end' | 'bottom-start' | 'bottom-center' | 'bottom-end';

export type ToastAction = {
	label: string;
	onClick: (event: MouseEvent) => void;
};

export type ToastId = string | number;

export type ToastOptions = {
	id?: ToastId;
	description?: string;
	duration?: number;
	action?: ToastAction;
	dismissible?: boolean;
	closeButton?: boolean;
	position?: ToastPosition;
};

export type ToastRecord = {
	id: ToastId;
	title: string;
	description?: string;
	variant: ToastVariant;
	duration?: number;
	action?: ToastAction;
	dismissible: boolean;
	closeButton?: boolean;
	position?: ToastPosition;
	/** Marks the toast for animated exit; toaster removes after exit. */
	delete?: boolean;
};

export type ToastDismissDetail = { id?: ToastId };
export type ToastShowDetail = Omit<ToastRecord, 'dismissible'> & { dismissible?: boolean };

export type PromiseToastMessages<T> = {
	loading: string;
	success: string | ((data: T) => string);
	error: string | ((error: unknown) => string);
	description?: string | ((data: T | unknown) => string);
	duration?: number;
	action?: ToastAction;
	closeButton?: boolean;
	position?: ToastPosition;
};

export const TOAST_LIFETIME = 4000;
export const TOAST_WIDTH = 356;
export const TOAST_GAP = 14;
export const TOAST_VIEWPORT_OFFSET = 24;
export const TOAST_VISIBLE_AMOUNT = 3;
export const TOAST_SWIPE_THRESHOLD = 45;
export const TOAST_EXIT_MS = 200;

export const DEFAULT_TOAST_POSITION: ToastPosition = 'bottom-end';

export function splitToastPosition(position: ToastPosition): {
	y: 'top' | 'bottom';
	x: 'start' | 'center' | 'end';
} {
	const [y, x] = position.split('-') as ['top' | 'bottom', 'start' | 'center' | 'end'];
	return { y, x };
}
