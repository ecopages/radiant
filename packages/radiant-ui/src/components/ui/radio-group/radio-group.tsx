import type { JsxHtmlProps, JsxRenderable } from '@ecopages/jsx';
import type { RuiRadioGroupProps } from './radio-group.script';
import './radio-group.script';

export type RuiRadioOption = {
	value: string;
	label: JsxRenderable;
	disabled?: boolean;
};

/**
 * Radio group with an `options` convenience API; renders one label-wrapped radio
 * per option inside `<rui-radio-group>`.
 *
 * @cssclass rui-radio - Option label row wrapping the input and control dot.
 * @cssclass rui-radio__input - Visually hidden native radio input.
 * @cssclass rui-radio__control - Custom control dot that mirrors check state.
 * @cssclass rui-radio__label - Option text.
 */
export function RuiRadioGroup({
	options,
	...props
}: JsxHtmlProps<RuiRadioGroupProps & { slot?: string; options: RuiRadioOption[] }>) {
	return (
		<rui-radio-group {...props}>
			{options.map((option) => (
				<label class="rui-radio">
					<input
						type="radio"
						class="rui-radio__input"
						value={option.value}
						disabled={option.disabled}
						data-disabled={option.disabled ? '' : undefined}
					/>
					<span class="rui-radio__control" aria-hidden="true"></span>
					<span class="rui-radio__label">{option.label}</span>
				</label>
			))}
		</rui-radio-group>
	);
}
