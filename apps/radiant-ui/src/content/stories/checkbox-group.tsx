import { RuiCheckbox } from '@ecopages/radiant-ui/checkbox';
import { RuiCheckboxGroup, RuiCheckboxGroupControl } from '@ecopages/radiant-ui/checkbox-group';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type CheckboxGroupArgs = {
	value: string;
	disabled: boolean;
	label: string;
	orientation: 'horizontal' | 'vertical';
};

export const meta = {
	args: {
		value: 'product,security',
		disabled: false,
		label: 'Email notifications',
		orientation: 'vertical',
	},
	argTypes: {
		value: { control: { type: 'text' } },
		disabled: { control: { type: 'boolean' } },
		label: { control: { type: 'text' } },
		orientation: { control: { type: 'radio' }, options: ['vertical', 'horizontal'] },
	},
	render: (args) => (
		<RuiCheckboxGroup
			value={args.value}
			disabled={args.disabled}
			label={args.label}
			orientation={args.orientation}
			name="notifications"
		>
			<RuiCheckboxGroupControl orientation={args.orientation}>
				<RuiCheckbox value="product">Product updates</RuiCheckbox>
				<RuiCheckbox value="security">Security alerts</RuiCheckbox>
				<RuiCheckbox value="marketing">Marketing emails</RuiCheckbox>
			</RuiCheckboxGroupControl>
		</RuiCheckboxGroup>
	),
} satisfies DocsMeta<CheckboxGroupArgs>;

type Story = DocsStory<CheckboxGroupArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'checkbox-group/default' } } });
