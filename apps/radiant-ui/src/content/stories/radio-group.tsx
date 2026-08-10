import { RuiRadioGroup } from '@ecopages/radiant-ui/radio-group';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type RadioGroupArgs = {
	value: string;
	disabled: boolean;
	label: string;
};

export const meta = {
	args: {
		value: 'pro',
		disabled: false,
		label: 'Plan',
	},
	argTypes: {
		value: { control: { type: 'text' } },
		disabled: { control: { type: 'boolean' } },
		label: { control: { type: 'text' } },
	},
	render: (args) => (
		<RuiRadioGroup
			value={args.value}
			disabled={args.disabled}
			label={args.label}
			options={[
				{ value: 'free', label: 'Free' },
				{ value: 'pro', label: 'Pro' },
			]}
		/>
	),
} satisfies DocsMeta<RadioGroupArgs>;

type Story = DocsStory<RadioGroupArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'radio-group/default' } } });
