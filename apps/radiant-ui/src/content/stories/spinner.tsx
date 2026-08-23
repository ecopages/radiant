import { RuiSpinner } from '@ecopages/radiant-ui/spinner';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type SpinnerArgs = {
	size: 'sm' | 'md' | 'lg';
};

export const meta = {
	args: { size: 'md' },
	argTypes: {
		size: {
			control: { type: 'select' },
			options: ['sm', 'md', 'lg'] as const satisfies readonly SpinnerArgs['size'][],
		},
	},
	render: (args) => <RuiSpinner size={args.size} />,
} satisfies DocsMeta<SpinnerArgs>;

type Story = DocsStory<SpinnerArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'spinner/default' } } });
