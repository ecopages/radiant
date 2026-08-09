import { radiantMeta, type StoryObj } from '@ecopages/storybook-radiant-vite';
import { RuiLabel } from './label';

const meta = {
	title: 'Components/Label',
	component: RuiLabel,
	args: {
		children: 'Email address',
	},
};
radiantMeta(meta, { stylesheets: ['./label.css'] });

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
