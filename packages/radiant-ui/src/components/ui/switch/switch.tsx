import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiSwitch as RuiSwitchElement, RuiSwitchProps } from './switch.script';
import './switch.script';

/**
 * Switch view. Stamps `[data-ref="input"]` on a native `role="switch"` checkbox
 * inside a label row with track and thumb chrome.
 *
 * @cssclass rui-switch - Label row: track + thumb + visible label.
 * @cssclass rui-switch__input - Native `role="switch"` input (visually hidden).
 * @cssclass rui-switch__track - Pill track; `primary` fill when checked.
 * @cssclass rui-switch__thumb - Sliding thumb.
 * @cssclass rui-switch__label - Light-DOM label text.
 *
 * @remarks Children render in `rui-switch__label`. The input always carries
 * `data-rui-control` and `data-rui-control-type="boolean"`.
 */
export function RuiSwitch({
	children,
	checked,
	disabled,
	name,
	...props
}: JsxCustomElementAttributes<RuiSwitchElement, RuiSwitchProps>) {
	return (
		<rui-switch {...props} checked={checked} disabled={disabled} name={name}>
			<label class="rui-switch">
				<input
					type="checkbox"
					role="switch"
					data-ref="input"
					data-rui-control
					data-rui-control-type="boolean"
					class="rui-switch__input"
					checked={checked}
					disabled={disabled}
					name={name || undefined}
				/>
				<span class="rui-switch__track" aria-hidden="true">
					<span class="rui-switch__thumb"></span>
				</span>
				<span class="rui-switch__label">{children}</span>
			</label>
		</rui-switch>
	);
}
