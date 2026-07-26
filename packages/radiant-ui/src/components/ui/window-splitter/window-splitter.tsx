import type { JsxRenderable } from '@ecopages/jsx';
import type { RadiantSlotProps } from '../../../types';
import { defineRadiantView } from '../../../lib/radiant-view';
import type { RuiWindowSplitterProps } from './window-splitter.script';
import { RuiWindowSplitter as RuiWindowSplitterElement } from './window-splitter.script';
import './window-splitter.css';

export const RuiWindowSplitter = defineRadiantView(
	RuiWindowSplitterElement,
	({
		slot,
		value,
		orientation,
		label,
		primary,
		secondary,
	}: RuiWindowSplitterProps & RadiantSlotProps & { primary: JsxRenderable; secondary: JsxRenderable }) => (
		<rui-window-splitter slot={slot} value={value} orientation={orientation} label={label}>
			<div slot="primary">{primary}</div>
			<div slot="secondary">{secondary}</div>
		</rui-window-splitter>
	),
);
