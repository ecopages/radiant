import type { JsxCustomElementAttributes, JsxRenderable } from '@ecopages/jsx';
import { cx } from '@/lib/cx';
import {
	WINDOW_SPLITTER_MAX,
	WINDOW_SPLITTER_MIN,
	type RuiWindowSplitter as RuiWindowSplitterElement,
	type RuiWindowSplitterProps,
} from './window-splitter.script';
import './window-splitter.script';

/**
 * Window splitter view with `primary` and `secondary` pane props.
 *
 * @cssclass rui-window-splitter - Root surface (`[data-ref="root"]`).
 * @cssclass rui-window-splitter--horizontal - Side-by-side panes.
 * @cssclass rui-window-splitter--vertical - Stacked panes.
 * @cssclass rui-window-splitter__pane - A pane region (`[data-ref="primary"]` / `[data-ref="secondary"]`).
 * @cssclass rui-window-splitter__separator - Focusable separator (`[data-ref="separator"]`).
 */
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
				<div
					data-ref="separator"
					class="rui-window-splitter__separator"
					role="separator"
					tabindex={0}
					aria-valuemin={WINDOW_SPLITTER_MIN}
					aria-valuemax={WINDOW_SPLITTER_MAX}
				></div>
				<div data-ref="secondary" class="rui-window-splitter__pane">
					{secondary}
				</div>
			</div>
		</rui-window-splitter>
	);
}
