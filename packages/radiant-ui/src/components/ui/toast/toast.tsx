import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiToast as RuiToastElement, RuiToastProps } from './toast.script';
import './toast.script';

import type { RuiToaster as RuiToasterElement, RuiToasterProps } from './toaster.script';
import './toaster.script';
import type { WithoutChildren } from '../../../lib/without-children';

/** The `<rui-toast>` element renders the toast surface, so the view takes no children. */
export type RuiToastViewProps = WithoutChildren<JsxCustomElementAttributes<RuiToastElement, RuiToastProps>>;

/**
 * JSX helper around `<rui-toast>`. Normally rendered by `<rui-toaster>`; author
 * directly only for static/embedded toast chrome.
 */
export function RuiToast({ toastId, ...props }: RuiToastViewProps) {
	return <rui-toast {...props} toastId={toastId != null ? String(toastId) : undefined} />;
}

/** The `<rui-toaster>` element renders the toast stack, so the view takes no children. */
export type RuiToasterViewProps = WithoutChildren<JsxCustomElementAttributes<RuiToasterElement, RuiToasterProps>>;

/**
 * JSX helper around `<rui-toaster>`. Mount once at the app root and drive with
 * `toast()`. See `RuiToasterElement` for the full contract.
 */
export function RuiToaster(props: RuiToasterViewProps) {
	return <rui-toaster {...props} />;
}
