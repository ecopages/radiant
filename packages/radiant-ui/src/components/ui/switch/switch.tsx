import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiSwitchProps } from './switch.script';
import { RuiSwitch as RuiSwitchElement } from './switch.script';

/**
 * Switch view — label text as light-DOM children; chrome comes from the host `render()`.
 *
 * @remarks
 * Do not SSR a full `.rui-switch` shell as children. The host projects authored
 * children into `.rui-switch__label` via `<slot>`; a pre-rendered shell would
 * paint a second track after hydration.
 */
export const RuiSwitch = defineRadiantView(
	RuiSwitchElement,
	({ children, ...props }: JsxHtmlPropsWithChildren<RuiSwitchProps & { slot?: string }>) => (
		<rui-switch {...props}>{children}</rui-switch>
	),
	{ stylesheets: ['./switch.css'] },
);
