import {
	RuiFeed,
	RuiFeedArticle,
	RuiFeedArticleContent,
	RuiFeedArticleHeader,
	RuiFeedByline,
} from '@ecopages/radiant-ui/feed';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type FeedArgs = {
	label: string;
	'aria-busy': boolean;
};

export const meta = {
	args: {
		label: 'Activity',
		'aria-busy': false,
	},
	argTypes: {
		label: { control: { type: 'text' } },
		'aria-busy': { control: { type: 'boolean' } },
	},
	render: (args) => (
		<RuiFeed label={args.label} aria-busy={args['aria-busy'] ? 'true' : undefined}>
			<RuiFeedArticle>
				<RuiFeedArticleHeader>
					<RuiFeedByline>Jane Cooper · 2 hours ago</RuiFeedByline>
				</RuiFeedArticleHeader>
				<RuiFeedArticleContent>Shipped order #4821.</RuiFeedArticleContent>
			</RuiFeedArticle>
		</RuiFeed>
	),
} satisfies DocsMeta<FeedArgs>;

type Story = DocsStory<FeedArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'feed/default' } } });
