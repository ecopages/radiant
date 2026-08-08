import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type DisclosureArgs = {
	open: boolean;
	animated: boolean;
	children: string;
};

export const meta = {
	component: 'disclosure',
	exportName: 'RuiDisclosure',
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
	exampleCode: (args) => buildExampleCode('RuiDisclosure', 'disclosure', args, args.children),
	render: (args) => renderPlaygroundPreview('disclosure', args, args.children),
} satisfies DocsMeta<DisclosureArgs>;

type Story = DocsStory<DisclosureArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'disclosure/default' } } });
