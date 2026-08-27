import type { RuiAlertLayout, RuiAlertProps, RuiAlertVariant } from '@ecopages/radiant-ui/alert';
import { RuiAlert, RuiAlertDescription, RuiAlertIcon, RuiAlertTitle } from '@ecopages/radiant-ui/alert';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

export type AlertArgs = Required<Pick<RuiAlertProps, 'variant' | 'layout' | 'dismissible'>>;

export const meta = {
	args: { variant: 'info', layout: 'inline', dismissible: false },
	argTypes: {
		variant: {
			control: { type: 'select' },
			options: ['info', 'success', 'warning', 'error'] as const satisfies readonly RuiAlertVariant[],
		},
		layout: {
			control: { type: 'radio' },
			options: ['inline', 'banner'] as const satisfies readonly RuiAlertLayout[],
		},
		dismissible: {
			control: { type: 'boolean' },
		},
	},
	render: (args) => {
		if (args.layout === 'banner') {
			return (
				<RuiAlert variant={args.variant} layout="banner" dismissible={args.dismissible}>
					<RuiAlertTitle>Documentation preview</RuiAlertTitle>
					<RuiAlertDescription>
						<p>
							This release includes breaking changes to the routing API. Review the migration guide before
							upgrading production apps.
						</p>
					</RuiAlertDescription>
				</RuiAlert>
			);
		}
		return (
			<RuiAlert variant={args.variant} layout="inline" dismissible={args.dismissible}>
				<RuiAlertIcon variant={args.variant} />
				<span>Your session will expire in 5 minutes.</span>
			</RuiAlert>
		);
	},
} satisfies DocsMeta<AlertArgs>;

type Story = DocsStory<AlertArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'alert/default' } } });

export const InlineWarning: Story = docsStory(meta, {
	args: { variant: 'warning', layout: 'inline' },
	parameters: { docs: { id: 'alert/inline-warning' } },
	render: (args) => (
		<RuiAlert variant={args.variant} layout="inline" dismissible={args.dismissible}>
			<RuiAlertIcon variant="warning" />
			<span>Disk space is running low.</span>
		</RuiAlert>
	),
});

export const Banner: Story = docsStory(meta, {
	args: { variant: 'info', layout: 'banner' },
	parameters: { docs: { id: 'alert/banner' } },
});

export const Dismissible: Story = docsStory(meta, {
	args: { variant: 'warning', layout: 'inline', dismissible: true },
	parameters: { docs: { id: 'alert/dismissible' } },
});
