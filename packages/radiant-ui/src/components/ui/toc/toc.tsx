import type { JsxHtmlProps } from '@ecopages/jsx';
import type { RuiTocProps } from './toc.script';
import './toc.script';

export type RuiTocViewProps = JsxHtmlProps<RuiTocProps>;

export function RuiToc({ target, headingSelector, label, scrollOffset, navigationEvents, ...props }: RuiTocViewProps) {
	return (
		<rui-toc
			{...props}
			prop:target={target}
			prop:headingSelector={headingSelector}
			prop:label={label}
			prop:scrollOffset={scrollOffset}
			prop:navigationEvents={navigationEvents}
		/>
	);
}
