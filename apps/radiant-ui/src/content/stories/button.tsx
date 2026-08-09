import type { RuiButtonProps, RuiButtonSize, RuiButtonVariant } from '@ecopages/radiant-ui/button';
import { RuiButton } from '@ecopages/radiant-ui/button';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type ButtonArgs = {
	variant: RuiButtonVariant;
	size: RuiButtonSize;
	disabled: boolean;
	toggle: boolean;
	pressed: boolean;
	children: string;
};

export const meta = {
	component: 'button',
	exportName: 'RuiButton',
	args: {
		variant: 'filled',
		size: 'md',
		disabled: false,
		toggle: false,
		pressed: false,
		children: 'Continue',
	},
	argTypes: {
		children: { control: { type: 'text' } },
		variant: {
			control: { type: 'select' },
			options: [
				'filled',
				'outline',
				'destructive',
				'ghost',
				'link',
			] as const satisfies readonly RuiButtonVariant[],
		},
		size: {
			control: { type: 'select' },
			options: ['none', 'sm', 'md', 'lg'] as const satisfies readonly RuiButtonSize[],
		},
		disabled: { control: { type: 'boolean' } },
		toggle: { control: { type: 'boolean' } },
		pressed: { control: { type: 'boolean' } },
	},
	render: (args) => {
		const props: RuiButtonProps = {
			variant: args.variant,
			size: args.size,
			disabled: args.disabled,
			toggle: args.toggle,
			pressed: args.pressed,
		};
		return <RuiButton {...props}>{args.children}</RuiButton>;
	},
} satisfies DocsMeta<ButtonArgs>;

type Story = DocsStory<ButtonArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'button/default' } } });

export const Destructive: Story = docsStory(meta, {
	args: { variant: 'destructive', children: 'Delete project' },
	parameters: { docs: { id: 'button/destructive' } },
});

export const Ghost: Story = docsStory(meta, {
	args: { variant: 'ghost', children: 'Cancel' },
	parameters: { docs: { id: 'button/ghost' } },
});

export const Link: Story = docsStory(meta, {
	args: { variant: 'link', size: 'none', children: 'View documentation' },
	parameters: { docs: { id: 'button/link' } },
});
