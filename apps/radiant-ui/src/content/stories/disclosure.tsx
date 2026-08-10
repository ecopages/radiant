import { RuiDisclosure } from '@ecopages/radiant-ui/disclosure';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type DisclosureArgs = {
	open: boolean;
	animated: boolean;
	children: string;
};

export const meta = {
	args: {
		open: false,
		animated: false,
		children: 'Shipping details',
	},
	argTypes: {
		open: { control: { type: 'boolean' } },
		animated: { control: { type: 'boolean' } },
		children: { control: { type: 'text' } },
	},
	render: (args) => (
		<RuiDisclosure open={args.open} animated={args.animated} trigger={args.children}>
			Delivered in 3–5 business days.
		</RuiDisclosure>
	),
} satisfies DocsMeta<DisclosureArgs>;

type Story = DocsStory<DisclosureArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'disclosure/default' } } });
