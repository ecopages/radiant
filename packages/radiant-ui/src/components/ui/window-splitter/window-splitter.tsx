import type { JsxCustomElementAttributes, JsxRenderable } from '@ecopages/jsx';
import type { RuiWindowSplitter as RuiWindowSplitterElement, RuiWindowSplitterProps } from './window-splitter.script';
import './window-splitter.script';

export function RuiWindowSplitter({
	primary,
	secondary,
	...props
}: JsxCustomElementAttributes<RuiWindowSplitterElement, RuiWindowSplitterProps> & {
	primary: JsxRenderable;
	secondary: JsxRenderable;
}) {
	return (
		<rui-window-splitter {...props}>
			<div slot="primary">{primary}</div>
			<div slot="secondary">{secondary}</div>
		</rui-window-splitter>
	);
}
