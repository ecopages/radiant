import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type AvatarArgs = {
	size: string;
	fallback: string;
	alt: string;
};

export const meta = {
	component: 'avatar',
	exportName: 'RuiAvatar',
	args: {
		size: 'md',
		fallback: 'JC',
		alt: 'Jane Cooper',
	},
	argTypes: {
		size: { control: { type: 'select' }, options: ['sm', 'md', 'lg'] as const },
		fallback: { control: { type: 'text' } },
		alt: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiAvatar', 'avatar', args),
	render: (args) => renderPlaygroundPreview('avatar', args),
} satisfies DocsMeta<AvatarArgs>;

type Story = DocsStory<AvatarArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'avatar/default' } } });
