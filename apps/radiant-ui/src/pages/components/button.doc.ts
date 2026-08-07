import { defineComponentDoc, definePlayground, defineScenario, booleanControl, selectControl } from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'button',
	title: 'Button',
	exportName: 'RuiButton',
	category: 'Actions',
	lede: 'Buttons trigger actions in the interface. Choose a variant that reflects importance, and write labels that describe the outcome — not the control type.',
	usage: {
		intro: 'Import `RuiButton` from the focused module. The default `filled` variant suits the primary action in a small context.',
		example: `import { RuiButton } from '@ecopages/radiant-ui/button';

<RuiButton variant="filled" size="md" on:click={saveChanges}>
  Save changes
</RuiButton>`,
	},
	guidance: [
		{
			id: 'choose-a-tone',
			title: 'Choose a tone',
			paragraphs: [
				'Use `filled` for the main action, `outline` for a supporting action, and `ghost` when the action should recede until needed.',
			],
			bullets: [
				'`destructive` is for irreversible operations like delete.',
				'Limit one `filled` button per view when possible.',
			],
		},
		{
			id: 'button-sizes',
			title: 'Small, Default, and Large',
			paragraphs: [
				'`size` accepts `sm`, `md` (Default), and `lg`. Each size changes padding and type scale — Small uses a smaller font so dense toolbars stay readable without looking oversized.',
			],
		},
		{
			id: 'toggle-buttons',
			title: 'Toggle buttons',
			paragraphs: [
				'Set `toggle` to manage `aria-pressed` on click, or control `pressed` directly for toolbar-style selection states.',
			],
		},
	],
	accessibility: [
		'Write labels that describe the resulting action, such as "Save changes".',
		'Keep disabled buttons explainable with nearby supporting text when needed.',
		'Do not use color as the only way to communicate action priority or status.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: [
					selectControl({
						prop: 'variant',
						label: 'Variant',
						defaultValue: 'filled',
						options: [
							{
								value: 'filled',
								label: 'Filled',
							},
							{
								value: 'outline',
								label: 'Outline',
							},
							{
								value: 'destructive',
								label: 'Destructive',
							},
							{
								value: 'ghost',
								label: 'Ghost',
							},
						],
					}),
					selectControl({
						prop: 'size',
						label: 'Size',
						defaultValue: 'md',
						options: [
							{
								value: 'sm',
								label: 'Small',
							},
							{
								value: 'md',
								label: 'Default',
							},
							{
								value: 'lg',
								label: 'Large',
							},
						],
					}),
					booleanControl({
						prop: 'disabled',
						label: 'Disabled',
						defaultValue: false,
					}),
					booleanControl({
						prop: 'toggle',
						label: 'Toggle',
						defaultValue: false,
					}),
					booleanControl({
						prop: 'pressed',
						label: 'Pressed',
						defaultValue: false,
					}),
				],
				children: 'Continue',
			}),
		],
	}),
});
