import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	booleanControl,
	numberControl,
	selectControl,
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'toast',
	title: 'Toast',
	exportName: 'RuiToaster',
	category: 'Feedback',
	lede: 'Toasts surface brief, non-blocking feedback after an action — save confirmations, errors, or background sync status.',
	usage: {
		intro: 'Mount `RuiToaster` once at the app root, then call `toast()` imperatively to show messages.',
		example: `import { RuiToaster, toast } from '@ecopages/radiant-ui/toast';
import { RuiButton } from '@ecopages/radiant-ui/button';

<RuiToaster position="bottom-end" duration={4000} />
<RuiButton on:click={() => toast.success('Changes saved')}>
  Save
</RuiButton>`,
	},
	guidance: [
		{
			id: 'toast-variants',
			title: 'Match variant to message',
			paragraphs: [
				'Use `success` for confirmations, `error` for failures, `warning` for caution, and `info` for neutral updates.',
			],
		},
		{
			id: 'duration',
			title: 'Duration and dismissal',
			paragraphs: [
				'Set `duration` per toast for urgent vs routine messages. Enable `closeButton` when users need time to read.',
			],
		},
	],
	accessibility: [
		'Toasts use `role="status"` for polite announcements that do not interrupt current tasks.',
		'Error toasts use `role="alert"` for immediate attention.',
		'Do not rely on toasts alone for critical errors — pair with inline field errors when appropriate.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: [
					selectControl({
						prop: 'position',
						label: 'Position',
						defaultValue: 'bottom-end',
						options: [
							{
								value: 'bottom-end',
								label: 'Bottom end',
							},
							{
								value: 'bottom-center',
								label: 'Bottom center',
							},
							{
								value: 'top-end',
								label: 'Top end',
							},
							{
								value: 'top-center',
								label: 'Top center',
							},
						],
					}),
					numberControl({
						prop: 'duration',
						label: 'Duration (ms)',
						defaultValue: 4000,
						min: 1000,
						max: 10000,
						step: 500,
					}),
					numberControl({
						prop: 'visibleToasts',
						label: 'Visible toasts',
						defaultValue: 3,
						min: 1,
						max: 5,
						step: 1,
					}),
					booleanControl({
						prop: 'closeButton',
						label: 'Close button',
						defaultValue: false,
					}),
					booleanControl({
						prop: 'expand',
						label: 'Expand on hover',
						defaultValue: false,
					}),
				],
			}),
		],
	}),
});
