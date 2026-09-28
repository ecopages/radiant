import { RuiToc } from '@ecopages/radiant-ui/toc';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

const TOC_TARGET = '.playground-toc-demo__article';

export type TocArgs = {
	headingSelector: string;
	label: string;
	scrollOffset: number;
};

export const meta = {
	args: {
		headingSelector: 'h2,h3',
		label: 'On this page',
		scrollOffset: 80,
	},
	argTypes: {
		headingSelector: { control: { type: 'text' } },
		label: { control: { type: 'text' } },
		scrollOffset: { control: { type: 'number' } },
	},
	render: (args) => (
		<div class="playground-toc-demo">
			<RuiToc
				target={TOC_TARGET}
				headingSelector={args.headingSelector}
				label={args.label}
				scrollOffset={args.scrollOffset}
			/>
			<article class="playground-toc-demo__article">
				<h2 id="overview">Overview</h2>
				<p>First section content with enough copy to show how the table of contents tracks headings.</p>
				<h2 id="configuration">Configuration</h2>
				<p>Second section content describing how to wire the component into your layout.</p>
				<h3 id="tokens">Design tokens</h3>
				<p>Nested section content for third-level headings in the outline.</p>
				<h2 id="next-steps">Next steps</h2>
				<p>Final section content with links and follow-up guidance.</p>
			</article>
		</div>
	),
} satisfies DocsMeta<TocArgs>;

type Story = DocsStory<TocArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'toc/default' } } });
