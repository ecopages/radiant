import { buildExampleCode } from '@/lib/playground';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';
import { renderPlaygroundPreview } from '@/components/component-playground/playground-previews';

export type AutocompleteArgs = {
	sensitivity: string;
};

export const meta = {
	component: 'autocomplete',
	exportName: 'RuiAutocomplete',
	args: {
		sensitivity: 'base',
	},
	argTypes: {
		sensitivity: { control: { type: 'select' }, options: ['base', 'accent', 'case'] as const },
	},
	exampleCode: (args) => buildExampleCode('RuiAutocomplete', 'autocomplete', args),
	render: (args) => renderPlaygroundPreview('autocomplete', args),
} satisfies DocsMeta<AutocompleteArgs>;

type Story = DocsStory<AutocompleteArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'autocomplete/default' } } });
