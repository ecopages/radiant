import type { JsxHtmlProps } from '@ecopages/jsx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiSliderProps } from './slider.script';
import { RuiSlider as RuiSliderElement } from './slider.script';

export type RuiSliderViewProps = JsxHtmlProps<
	RuiSliderProps & {
		slot?: string;
		values?: [number, number];
	}
>;

export const RuiSlider = defineRadiantView(
	RuiSliderElement,
	({ values, ...props }: RuiSliderViewProps) => (
		<rui-slider {...props} rangeMin={values?.[0]} rangeMax={values?.[1]} />
	),
	{ stylesheets: ['./slider.css'] },
);
