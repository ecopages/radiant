import type { JsxHtmlProps } from '@ecopages/jsx';
import type { RuiSliderProps } from './slider.script';
import './slider.script';

export type RuiSliderViewProps = JsxHtmlProps<
	RuiSliderProps & {
		slot?: string;
		values?: [number, number];
	}
>;

export function RuiSlider({ values, ...props }: RuiSliderViewProps) {
	return <rui-slider {...props} rangeMin={values?.[0]} rangeMax={values?.[1]} />;
}
