import { RuiAvatar, type RuiAvatarSize } from '@ecopages/radiant-ui/avatar';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type AvatarArgs = {
	size: RuiAvatarSize;
	fallback: string;
	alt: string;
};

export const meta = {
	args: {
		size: 'md',
		fallback: 'JC',
		alt: 'Jane Cooper',
	},
	argTypes: {
		size: { control: { type: 'select' }, options: ['sm', 'md', 'lg'] as const satisfies readonly RuiAvatarSize[] },
		fallback: { control: { type: 'text' } },
		alt: { control: { type: 'text' } },
	},
	render: (args) => <RuiAvatar size={args.size} fallback={args.fallback} alt={args.alt} />,
} satisfies DocsMeta<AvatarArgs>;

type Story = DocsStory<AvatarArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'avatar/default' } } });
