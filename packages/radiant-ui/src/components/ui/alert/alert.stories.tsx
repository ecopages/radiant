import { radiantMeta, type StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { isStaticSsrPreview } from '@/lib/storybook-ssr';
import type { RuiAlertProps } from './alert.script';
import { RuiAlert, RuiAlertDescription, RuiAlertIcon, RuiAlertTitle } from './alert';
import { RuiAlert as RuiAlertElement } from './alert.script';

const renderAlert = (args: RuiAlertProps) => {
	if (args.layout === 'banner') {
		return (
			<RuiAlert {...args}>
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
		<RuiAlert {...args}>
			<RuiAlertIcon variant={args.variant ?? 'info'} />
			<span>Your session will expire in 5 minutes.</span>
		</RuiAlert>
	);
};

const meta = {
	title: 'Components/Alert',
	component: RuiAlert,
	args: { variant: 'info', layout: 'inline', dismissible: false },
	argTypes: {
		variant: { control: { type: 'select' }, options: ['info', 'success', 'warning', 'error'] },
		layout: { control: { type: 'select' }, options: ['inline', 'banner'] },
		dismissible: { control: { type: 'boolean' } },
	},
	render: renderAlert,
};
radiantMeta(meta, { element: RuiAlertElement, stylesheets: ['./alert.css'] });

export default meta;
type Story = StoryObj<RuiAlertProps>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;

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
export const Banner: Story = { args: { variant: 'info', layout: 'banner' }, render: renderAlert };
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

export const Dismissible: Story = {
	args: { variant: 'warning', layout: 'inline', dismissible: true },
	render: (args) => (
		<RuiAlert {...args}>
			<RuiAlertIcon variant="warning" />
			<span>Your session will expire in 5 minutes.</span>
		</RuiAlert>
	),
	play: async ({ canvasElement, step }) => {
		if (isStaticSsrPreview(canvasElement)) return;

		const host = canvasElement.querySelector('rui-alert');
		await expect(host).toBeInTheDocument();

		const onClose = fn();
		host?.addEventListener('rui-close', onClose);

		await step('dismiss control removes the alert and emits rui-close', async () => {
			const close = canvasElement.querySelector('[data-alert-close]') as HTMLButtonElement;
			await expect(close).toBeInTheDocument();
			await userEvent.click(close);
			await expect(onClose).toHaveBeenCalledTimes(1);
			await expect(canvasElement.querySelector('rui-alert')).not.toBeInTheDocument();
		});
	},
};
