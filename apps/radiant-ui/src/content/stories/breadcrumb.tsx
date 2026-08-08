import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type BreadcrumbArgs = {
	label: string;
	separator: string;
};

export const meta = {
	component: 'breadcrumb',
	exportName: 'RuiBreadcrumb',
	args: {
		label: 'Breadcrumb',
		separator: '/',
	},
	argTypes: {
		label: { control: { type: 'text' } },
		separator: { control: { type: 'text' } },
	},
	exampleCode: (args) => buildExampleCode('RuiBreadcrumb', 'breadcrumb', args),
	render: (args) => renderPlaygroundPreview('breadcrumb', args),
} satisfies DocsMeta<BreadcrumbArgs>;

type Story = DocsStory<BreadcrumbArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'breadcrumb/default' } } });
