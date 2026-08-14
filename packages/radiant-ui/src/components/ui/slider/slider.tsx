import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiSlider as RuiSliderElement, RuiSliderProps } from './slider.script';
import './slider.script';

export type RuiSliderViewProps = JsxCustomElementAttributes<
	RuiSliderElement,
	RuiSliderProps & {
		values?: [number, number];
	}
>;

export function RuiSlider({ values, ...props }: RuiSliderViewProps) {
	return <rui-slider {...props} rangeMin={values?.[0]} rangeMax={values?.[1]} />;
}
