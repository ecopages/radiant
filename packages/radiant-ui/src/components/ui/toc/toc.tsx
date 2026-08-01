import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiTocProps } from './toc.script';
import { RuiToc as RuiTocElement } from './toc.script';

export type RuiTocViewProps = RuiTocProps & {
	class?: string;
};

export const RuiToc = defineRadiantView(
	RuiTocElement,
	({ target, headingSelector, label, scrollOffset, navigationEvents, class: className }: RuiTocViewProps) => (
		<rui-toc
			class={className}
			prop:target={target}
			prop:headingSelector={headingSelector}
			prop:label={label}
			prop:scrollOffset={scrollOffset}
			prop:navigationEvents={navigationEvents}
		></rui-toc>
	),

	{ stylesheets: ['./toc.css'] },
);
