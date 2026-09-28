import { RuiField } from '@ecopages/radiant-ui/field';
import { RuiFieldDescription } from '@ecopages/radiant-ui/field';
import { RuiInput } from '@ecopages/radiant-ui/input';
import { RuiInputGroup, RuiInputGroupAddon, RuiInputGroupText } from '@ecopages/radiant-ui/input-group';
import { RuiLabel } from '@ecopages/radiant-ui/label';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export const meta = {
	args: {},
	render: () => (
		<RuiField name="url">
			<RuiLabel>Website URL</RuiLabel>
			<RuiInputGroup>
				<RuiInputGroupAddon>
					<RuiInputGroupText>https://</RuiInputGroupText>
				</RuiInputGroupAddon>
				<RuiInput id="input-group-url" placeholder="example.com" />
			</RuiInputGroup>
			<RuiFieldDescription>Include only the domain — the protocol is added automatically.</RuiFieldDescription>
		</RuiField>
	),
} satisfies DocsMeta<Record<string, never>>;

type Story = DocsStory<Record<string, never>>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'input-group/default' } } });
