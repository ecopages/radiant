import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type FeedArgs = {
	label: string;
	'aria-busy': boolean;
};

export const meta = {
	component: 'feed',
	exportName: 'RuiFeed',
	args: {
		label: 'Activity',
		'aria-busy': false,
	},
	argTypes: {
		label: { control: { type: 'text' } },
		'aria-busy': { control: { type: 'boolean' } },
	},
	exampleCode: (args) => buildExampleCode('RuiFeed', 'feed', args),
	render: (args) => renderPlaygroundPreview('feed', args),
} satisfies DocsMeta<FeedArgs>;

type Story = DocsStory<FeedArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'feed/default' } } });
