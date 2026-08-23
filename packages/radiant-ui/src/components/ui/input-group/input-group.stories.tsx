import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { RuiButton } from '../button';
import { RuiField } from '../field';
import { RuiFieldDescription } from '../field/field-description';
import { RuiInput } from '../input';
import { RuiLabel } from '../label';
import { RuiInputGroup, RuiInputGroupAddon, RuiInputGroupText } from './input-group';

const meta = {
	title: 'Components/Input Group',
	component: RuiInputGroup,
	parameters: {
		radiant: {
			cssImports: [
				'./input-group.css',
				'../input/input.css',
				'../field/field.css',
				'../label/label.css',
				'../button/button.css',
			],
		},
	},
} satisfies Meta<typeof RuiInputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<RuiField name="url">
			<RuiLabel>Website URL</RuiLabel>
			<RuiInputGroup>
				<RuiInputGroupAddon>
					<RuiInputGroupText>https://</RuiInputGroupText>
				</RuiInputGroupAddon>
				<RuiInput id="input-group-url" placeholder="example.com" />
				<RuiInputGroupAddon align="end">
					<RuiButton variant="ghost" size="sm" square aria-label="More info">
						i
					</RuiButton>
				</RuiInputGroupAddon>
			</RuiInputGroup>
			<RuiFieldDescription>Include only the domain — the protocol is added automatically.</RuiFieldDescription>
		</RuiField>
	),
};

export const PrefixOnly: Story = {
	render: () => (
		<RuiInputGroup>
			<RuiInputGroupAddon>
				<RuiInputGroupText>$</RuiInputGroupText>
			</RuiInputGroupAddon>
			<RuiInput placeholder="0.00" />
		</RuiInputGroup>
	),
};
