import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect } from 'storybook/test';
import { RuiAlert } from './alert';

const meta = {
	title: 'Components/Alert',
	component: RuiAlert,
	args: {
		variant: 'info',
		children: 'Your session will expire in 5 minutes.',
	},
} satisfies Meta<typeof RuiAlert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	play: async ({ canvasElement, step }) => {
		await step('alert exposes role=alert', async () => {
			const alert = canvasElement.querySelector('[role="alert"]');
			await expect(alert).toBeInTheDocument();
			await expect(alert).toHaveTextContent('Your session will expire in 5 minutes.');
		});
	},
};

export const Success: Story = {
	args: {
		variant: 'success',
		children: (
			<div class="flex items-center gap-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="lucide lucide-circle-check"
				>
					<circle cx="12" cy="12" r="10"></circle>
					<path d="m9 12 2 2 4-4"></path>
				</svg>
				<span>Profile saved.</span>
			</div>
		),
	},
};

export const Warning: Story = {
	args: {
		variant: 'warning',
		children: (
			<div class="flex items-center gap-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="lucide lucide-triangle-alert"
				>
					<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"></path>
					<path d="M12 9v4"></path>
					<path d="M12 17h.01"></path>
				</svg>
				<span>Disk space is running low.</span>
			</div>
		),
	},
};

export const Error: Story = {
	args: {
		variant: 'error',
		children: (
			<div class="flex items-center gap-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="lucide lucide-circle-x"
				>
					<circle cx="12" cy="12" r="10"></circle>
					<path d="m15 9-6 6"></path>
					<path d="m9 9 6 6"></path>
				</svg>
				<span>Unable to reach the server.</span>
			</div>
		),
	},
};
