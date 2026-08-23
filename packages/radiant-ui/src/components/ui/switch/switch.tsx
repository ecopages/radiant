import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiSwitch as RuiSwitchElement, RuiSwitchProps } from './switch.script';
import './switch.script';

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
