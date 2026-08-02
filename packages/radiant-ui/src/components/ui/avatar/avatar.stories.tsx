import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { RuiAvatar } from './avatar';

const meta = {
	title: 'Components/Avatar',
	component: RuiAvatar,
} satisfies Meta<typeof RuiAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = {
	args: {
		alt: 'Jane Doe',
	},
};

export const Sizes: Story = {
	render: () => (
		<div class="flex items-center gap-inline">
			<RuiAvatar size="sm" alt="Ada Lovelace" />
			<RuiAvatar size="md" alt="Grace Hopper" />
			<RuiAvatar size="lg" alt="Alan Turing" />
		</div>
	),
};

export const WithImage: Story = {
	args: {
		src: 'https://avatars.githubusercontent.com/u/9919?v=4',
		alt: 'GitHub',
	},
};
