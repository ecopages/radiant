import type { JsxHtmlProps, JsxRenderable } from '@ecopages/jsx';
import type { RuiWindowSplitterProps } from './window-splitter.script';
import './window-splitter.script';

export function RuiWindowSplitter({
	primary,
	secondary,
	...props
}: JsxHtmlProps<RuiWindowSplitterProps & { slot?: string; primary: JsxRenderable; secondary: JsxRenderable }>) {
	return (
		<rui-window-splitter {...props}>
			<div slot="primary">{primary}</div>
			<div slot="secondary">{secondary}</div>
		</rui-window-splitter>
	);
}
