import type { RuiSwitchProps } from '@ecopages/radiant-ui/switch';
import { RuiSwitch } from '@ecopages/radiant-ui/switch';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type SwitchArgs = Required<Pick<RuiSwitchProps, 'checked' | 'disabled'>> & { children: string };

export const meta = {
	component: 'switch',
	exportName: 'RuiSwitch',
	args: { checked: false, disabled: false, children: 'Email notifications' },
	argTypes: {
		checked: { control: { type: 'boolean' } },
		disabled: { control: { type: 'boolean' } },
		children: { control: { type: 'text' } },
	},
	render: (args) => (
		<RuiSwitch checked={args.checked} disabled={args.disabled}>
			{args.children}
		</RuiSwitch>
	),
} satisfies DocsMeta<SwitchArgs>;

type Story = DocsStory<SwitchArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'switch/default' } } });

export const On: Story = docsStory(meta, {
	args: { checked: true, children: 'Dark mode' },
	parameters: { docs: { id: 'switch/on' } },
});
