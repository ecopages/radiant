import type { JsxHtmlProps, JsxRenderable } from '@ecopages/jsx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiWindowSplitterProps } from './window-splitter.script';
import { RuiWindowSplitter as RuiWindowSplitterElement } from './window-splitter.script';

export const RuiWindowSplitter = defineRadiantView(
	RuiWindowSplitterElement,
	({
		primary,
		secondary,
		...props
	}: JsxHtmlProps<RuiWindowSplitterProps & { slot?: string; primary: JsxRenderable; secondary: JsxRenderable }>) => (
		<rui-window-splitter {...props}>
			<div slot="primary">{primary}</div>
			<div slot="secondary">{secondary}</div>
		</rui-window-splitter>
	),
	{ stylesheets: ['./window-splitter.css'] },
);
