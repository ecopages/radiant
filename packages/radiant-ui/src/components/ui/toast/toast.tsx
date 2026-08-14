import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiToast as RuiToastElement, RuiToastProps } from './toast.script';
import './toast.script';

import type { RuiToaster as RuiToasterElement, RuiToasterProps } from './toaster.script';
import './toaster.script';

export type RuiToastViewProps = JsxCustomElementAttributes<RuiToastElement, RuiToastProps>;

/**
 * JSX helper around `<rui-toast>`. Normally rendered by `<rui-toaster>`; author
 * directly only for static/embedded toast chrome.
 */
export function RuiToast({ toastId, ...props }: RuiToastViewProps) {
	return <rui-toast {...props} toastId={toastId != null ? String(toastId) : undefined} />;
}

export type RuiToasterViewProps = JsxCustomElementAttributes<RuiToasterElement, RuiToasterProps>;

/**
 * JSX helper around `<rui-toaster>`. Mount once at the app root and drive with
 * `toast()`. See `RuiToasterElement` for the full contract.
 */
export function RuiToaster({ children, ...props }: RuiToasterViewProps) {
	return <rui-toaster {...props}>{children}</rui-toaster>;
}
