import type { RadiantSlotProps } from '../../../types';
import { defineRadiantView } from '../../../lib/radiant-view';
import type { RuiSliderProps } from './slider.script';
import { RuiSlider as RuiSliderElement } from './slider.script';
import './slider.css';

export type RuiSliderViewProps = RuiSliderProps &
	RadiantSlotProps & {
		values?: [number, number];
	};

export const RuiSlider = defineRadiantView(
	RuiSliderElement,
	({ slot, variant, value, values, min, max, step, minDistance, disabled, label, name }: RuiSliderViewProps) => (
		<rui-slider
			slot={slot}
			variant={variant}
			value={value}
			rangeMin={values?.[0]}
			rangeMax={values?.[1]}
			min={min}
			max={max}
			step={step}
			minDistance={minDistance}
			disabled={disabled}
			label={label}
			name={name}
		/>
	),
);
