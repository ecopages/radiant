import {
	RUI_TOAST_DISMISS_EVENT,
	RUI_TOAST_SHOW_EVENT,
	type PromiseToastMessages,
	type ToastDismissDetail,
	type ToastId,
	type ToastOptions,
	type ToastShowDetail,
} from './toast-context';
import { toastState } from './toast-state';

export type ToastCallable = {
	(title: string, options?: ToastOptions): ToastId;
	message: (title: string, options?: ToastOptions) => ToastId;
	success: (title: string, options?: ToastOptions) => ToastId;
	error: (title: string, options?: ToastOptions) => ToastId;
	info: (title: string, options?: ToastOptions) => ToastId;
	warning: (title: string, options?: ToastOptions) => ToastId;
	loading: (title: string, options?: ToastOptions) => ToastId;
	promise: <T>(promise: Promise<T> | (() => Promise<T>), messages: PromiseToastMessages<T>) => ToastId;
	dismiss: (id?: ToastId) => void;
	/** Remove all toasts from the store (Storybook / test resets). */
	clear: () => void;
};

/**
 * Primary imperative toast API (Sonner-shaped). Requires a mounted `<rui-toaster>`.
 * Prefer this over {@link showToast} in application code.
 */
export const toast: ToastCallable = Object.assign(
	(title: string, options?: ToastOptions) => toastState.create(title, options),
	{
		message: (title: string, options?: ToastOptions) => toastState.message(title, options),
		success: (title: string, options?: ToastOptions) => toastState.success(title, options),
		error: (title: string, options?: ToastOptions) => toastState.error(title, options),
		info: (title: string, options?: ToastOptions) => toastState.info(title, options),
		warning: (title: string, options?: ToastOptions) => toastState.warning(title, options),
		loading: (title: string, options?: ToastOptions) => toastState.loading(title, options),
		promise: <T>(promise: Promise<T> | (() => Promise<T>), messages: PromiseToastMessages<T>) =>
			toastState.promise(promise, messages),
		dismiss: (id?: ToastId) => toastState.dismiss(id),
		clear: () => toastState.clear(),
	},
);

/**
 * DOM event bridge: dispatches `rui-toast-show` on `document` for hosts that listen globally.
 * Application code should use {@link toast} unless you intentionally decouple via custom events.
 */
export function showToast(detail: ToastShowDetail): void {
	document.dispatchEvent(
		new CustomEvent(RUI_TOAST_SHOW_EVENT, {
			detail,
			bubbles: true,
			composed: true,
		}),
	);
}

/**
 * DOM event bridge: dispatches `rui-toast-dismiss` on `document`.
 * Application code should use {@link toast.dismiss} unless you intentionally decouple via custom events.
 */
export function dismissToast(id?: ToastId): void {
	const detail: ToastDismissDetail = id == null ? {} : { id };
	document.dispatchEvent(
		new CustomEvent(RUI_TOAST_DISMISS_EVENT, {
			detail,
			bubbles: true,
			composed: true,
		}),
	);
}
