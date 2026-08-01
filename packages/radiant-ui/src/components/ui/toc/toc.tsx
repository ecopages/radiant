import type { JsxHtmlProps } from '@ecopages/jsx';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiTocProps } from './toc.script';
import { RuiToc as RuiTocElement } from './toc.script';

export type RuiTocViewProps = JsxHtmlProps<RuiTocProps>;

export const RuiToc = defineRadiantView(
	RuiTocElement,
	({ target, headingSelector, label, scrollOffset, navigationEvents, ...props }: RuiTocViewProps) => (
		<rui-toc
			{...props}
			prop:target={target}
			prop:headingSelector={headingSelector}
			prop:label={label}
			prop:scrollOffset={scrollOffset}
			prop:navigationEvents={navigationEvents}
		/>
	),
	{ stylesheets: ['./toc.css'] },
);
