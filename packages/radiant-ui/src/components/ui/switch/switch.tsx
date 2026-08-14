import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiSwitch as RuiSwitchElement, RuiSwitchProps } from './switch.script';
import './switch.script';

/**
 * Switch view — label text as light-DOM children; chrome comes from the host `render()`.
 *
 * @remarks
 * Do not SSR a full `.rui-switch` shell as children. The host projects authored
 * children into `.rui-switch__label` via `<slot>`; a pre-rendered shell would
 * paint a second track after hydration.
 */
export function RuiSwitch({ children, ...props }: JsxCustomElementAttributes<RuiSwitchElement, RuiSwitchProps>) {
	return <rui-switch {...props}>{children}</rui-switch>;
}
