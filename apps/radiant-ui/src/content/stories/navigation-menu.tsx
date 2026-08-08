import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type NavigationMenuArgs = {
	label: string;
};

export const meta = {
	component: 'navigation-menu',
	exportName: 'RuiNavigationMenu',
	args: {
		label: 'Main',
	},
	argTypes: {
		label: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiNavigationMenu', 'navigation-menu', args),
	render: (args) => renderPlaygroundPreview('navigation-menu', args),
} satisfies DocsMeta<NavigationMenuArgs>;

type Story = DocsStory<NavigationMenuArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'navigation-menu/default' } } });
