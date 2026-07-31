import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect } from 'storybook/test';
import type { RuiAlertProps } from './alert.script';
import { RuiAlert, RuiAlertDescription, RuiAlertIcon, RuiAlertTitle } from './alert';

const meta = {
	title: 'Components/Alert',
	component: RuiAlert,
	args: {
		variant: 'info',
		layout: 'inline',
	},
	render: (args: RuiAlertProps) => (
		<RuiAlert {...args}>
			<RuiAlertIcon variant={args.variant ?? 'info'} />
			<span>Your session will expire in 5 minutes.</span>
		</RuiAlert>
	),
} satisfies Meta<RuiAlertProps>;

export default meta;
type Story = StoryObj<RuiAlertProps>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		await step('alert exposes role=alert', async () => {
			const alert = canvasElement.querySelector('[role="alert"]');
			await expect(alert).toBeInTheDocument();
			await expect(alert).toHaveTextContent('Your session will expire in 5 minutes.');
		});
	},
};

export const InlineWarning: Story = {
	args: { variant: 'warning', layout: 'inline' },
	render: (args) => (
		<RuiAlert {...args}>
			<RuiAlertIcon variant="warning" />
			<span>Disk space is running low.</span>
		</RuiAlert>
	),
};

export const InlineError: Story = {
	args: { variant: 'error', layout: 'inline' },
	render: (args) => (
		<RuiAlert {...args}>
			<RuiAlertIcon variant="error" />
			<span>Unable to reach the server.</span>
		</RuiAlert>
	),
};

export const InlineSuccess: Story = {
	args: { variant: 'success', layout: 'inline' },
	render: (args) => (
		<RuiAlert {...args}>
			<RuiAlertIcon variant="success" />
			<span>Profile saved.</span>
		</RuiAlert>
	),
};

export const Banner: Story = {
	args: { variant: 'info', layout: 'banner' },
	render: (args) => (
		<RuiAlert {...args}>
			<RuiAlertTitle>Documentation preview</RuiAlertTitle>
			<RuiAlertDescription>
				<p>
					This release includes breaking changes to the routing API. Review the migration guide before
					upgrading production apps.
				</p>
			</RuiAlertDescription>
		</RuiAlert>
	),
};

export const BannerWarning: Story = {
	args: { variant: 'warning', layout: 'banner' },
	render: (args) => (
		<RuiAlert {...args}>
			<RuiAlertTitle>Scheduled maintenance</RuiAlertTitle>
			<RuiAlertDescription>
				<p>The dashboard will be unavailable on Sunday from 02:00–04:00 UTC.</p>
				<p>Save work in progress before the window starts.</p>
			</RuiAlertDescription>
		</RuiAlert>
	),
};
