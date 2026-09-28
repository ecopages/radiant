import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { RuiHeading, RuiHeadingDescription, RuiHeadingEyebrow, RuiHeadingTitle } from './heading';

const meta = {
	title: 'Components/Heading',
	component: RuiHeading,
	parameters: { radiant: { cssImports: ['../headline/headline.css', './heading.css'] } },
} satisfies Meta<typeof RuiHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hero: Story = {
	render: () => (
		<div class="flex min-h-72 items-center justify-center rounded-container bg-surface-container-low px-8 py-16">
			<RuiHeading align="center" size="xl">
				<RuiHeadingEyebrow>Design system</RuiHeadingEyebrow>
				<RuiHeadingTitle as="h1">Build interfaces that feel inevitable</RuiHeadingTitle>
				<RuiHeadingDescription>
					Composable typography with a clear rhythm — eyebrow tight to the title, supporting line with room to
					breathe.
				</RuiHeadingDescription>
			</RuiHeading>
		</div>
	),
};

export const DocsSection: Story = {
	render: () => (
		<div class="max-w-2xl border-l-2 border-primary pl-6">
			<RuiHeading as="header" size="md">
				<RuiHeadingEyebrow>Getting started</RuiHeadingEyebrow>
				<RuiHeadingTitle as="h2">Installation</RuiHeadingTitle>
				<RuiHeadingDescription>
					Load a theme and component styles before registering elements. One import graph keeps tokens and
					widgets in sync.
				</RuiHeadingDescription>
			</RuiHeading>
		</div>
	),
};

export const FeaturePair: Story = {
	render: () => (
		<div class="grid max-w-4xl gap-10 md:grid-cols-2">
			<RuiHeading size="lg">
				<RuiHeadingEyebrow>Primitives</RuiHeadingEyebrow>
				<RuiHeadingTitle as="h2">Typography that scales</RuiHeadingTitle>
				<RuiHeadingDescription>
					Display sizes inherit from a shared token pack so heroes, docs, and dense settings panels stay in
					one family.
				</RuiHeadingDescription>
			</RuiHeading>
			<RuiHeading size="lg">
				<RuiHeadingEyebrow>Composition</RuiHeadingEyebrow>
				<RuiHeadingTitle as="h2">Slots over prop bags</RuiHeadingTitle>
				<RuiHeadingDescription>
					Omit empty parts. Drop chips, avatars, and actions beside the heading — never as optional string
					props on a shared base.
				</RuiHeadingDescription>
			</RuiHeading>
		</div>
	),
};

export const DashboardSection: Story = {
	render: () => (
		<section class="max-w-md rounded-container border border-border bg-background p-inset">
			<RuiHeading size="sm">
				<RuiHeadingEyebrow>Account</RuiHeadingEyebrow>
				<RuiHeadingTitle as="h3">Profile settings</RuiHeadingTitle>
				<RuiHeadingDescription>
					Update your name, email, and notification preferences for this workspace.
				</RuiHeadingDescription>
			</RuiHeading>
		</section>
	),
};

export const TitleOnly: Story = {
	render: () => (
		<RuiHeading size="md">
			<RuiHeadingTitle>Quick start</RuiHeadingTitle>
		</RuiHeading>
	),
};

export const SizeLadder: Story = {
	render: () => (
		<div class="flex max-w-3xl flex-col divide-y divide-border">
			{(
				[
					['SM', 'Settings group', 'Compact rhythm for nested panels and dense app UI.'],
					['MD', 'Documentation page', 'Default scale for docs sections and product pages.'],
					['LG', 'Feature overview', 'More presence for landing sections without extra wrappers.'],
					['XL', 'Product hero', 'Maximum display weight for first-viewport messaging.'],
				] as const
			).map(([size, title, description]) => (
				<div class="py-8 first:pt-0 last:pb-0">
					<RuiHeading size={size.toLowerCase() as 'sm' | 'md' | 'lg' | 'xl'}>
						<RuiHeadingEyebrow>{size}</RuiHeadingEyebrow>
						<RuiHeadingTitle as="h2">{title}</RuiHeadingTitle>
						<RuiHeadingDescription>{description}</RuiHeadingDescription>
					</RuiHeading>
				</div>
			))}
		</div>
	),
};
