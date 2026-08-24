import type { JsxCustomElementAttributes, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import type { RuiWindowSplitter as RuiWindowSplitterElement, RuiWindowSplitterProps } from './window-splitter.script';
import './window-splitter.script';

export function RuiWindowSplitter({
	primary,
	secondary,
	orientation = 'horizontal',
	...props
}: JsxCustomElementAttributes<RuiWindowSplitterElement, RuiWindowSplitterProps> & {
	primary: JsxRenderable;
	secondary: JsxRenderable;
}) {
	const horizontal = orientation !== 'vertical';

	return (
		<rui-window-splitter {...props} orientation={orientation}>
			<div
				class={cx(
					'rui-window-splitter',
					horizontal ? 'rui-window-splitter--horizontal' : 'rui-window-splitter--vertical',
				)}
				data-ref="root"
			>
				<div data-ref="primary" class="rui-window-splitter__pane">
					{primary}
				</div>
				<div data-ref="separator" class="rui-window-splitter__separator" role="separator" tabindex={0}></div>
				<div data-ref="secondary" class="rui-window-splitter__pane">
					{secondary}
				</div>
			</div>
		</rui-window-splitter>
	);
}
