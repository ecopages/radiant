import type { JsxHtmlPropsWithChildren } from '@ecopages/jsx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiSwitchProps } from './switch.script';
import { RuiSwitch as RuiSwitchElement } from './switch.script';

type RuiSwitchViewProps = JsxHtmlPropsWithChildren<RuiSwitchProps & { slot?: string }>;

/**
 * Light-DOM shell for SSR and no-JS fallbacks.
 *
 * @remarks Eco page SSR often serializes the view before the custom element
 * registry is available. Emitting the same structure as {@link RuiSwitchElement}
 * keeps the track, thumb, and label painted on first paint.
 */
function renderSwitchShell({ children, checked, disabled, name }: RuiSwitchViewProps) {
	return (
		<label class="rui-switch">
			<input
				type="checkbox"
				role="switch"
				class="rui-switch__input"
				data-rui-control
				data-rui-control-type="boolean"
				checked={checked}
				disabled={disabled}
				name={name}
			/>
			<span class="rui-switch__track" aria-hidden="true">
				<span class="rui-switch__thumb"></span>
			</span>
			<span class="rui-switch__label">{children}</span>
		</label>
	);
}

export const RuiSwitch = defineRadiantView(
	RuiSwitchElement,
	({ children, checked, disabled, name, ...props }: RuiSwitchViewProps) => (
		<rui-switch {...props} checked={checked} disabled={disabled} name={name}>
			{renderSwitchShell({ children, checked, disabled, name })}
		</rui-switch>
	),
	{ stylesheets: ['./switch.css'] },
);
