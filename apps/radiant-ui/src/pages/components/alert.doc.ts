import { defineComponentDoc, definePlayground, defineScenario, selectControl, textControl } from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'alert',
	title: 'Alert',
	exportName: 'RuiAlert',
	category: 'Feedback',
	lede: 'Alerts surface time-sensitive status without blocking the interface. Use them for session warnings, sync failures, or confirmations that do not warrant a modal.',
	usage: {
		intro: 'Compose `RuiAlert` with `RuiAlertIcon` and short text for `layout="inline"`, or `RuiAlertTitle` and `RuiAlertDescription` for `layout="banner"`. Banner layouts omit the icon.',
		example: `import { RuiAlert, RuiAlertIcon } from '@ecopages/radiant-ui/alert';

<RuiAlert variant="warning" layout="inline">
  <RuiAlertIcon variant="warning" />
  <span>Your session will expire in 5 minutes.</span>
</RuiAlert>

// Banner advisories — title + description, no icon
import { RuiAlert, RuiAlertTitle, RuiAlertDescription } from '@ecopages/radiant-ui/alert';

<RuiAlert variant="info" layout="banner">
  <RuiAlertTitle>Documentation preview</RuiAlertTitle>
  <RuiAlertDescription>
    <p>This release includes breaking changes to the routing API.</p>
  </RuiAlertDescription>
</RuiAlert>`,
	},
	guidance: [
		{
			id: 'choose-variant',
			title: 'Match severity to variant',
			paragraphs: [
				'Reserve `error` for blocking problems the user must address. Use `warning` for risk that is recoverable, `success` for completed operations, and `info` for neutral context.',
			],
		},
		{
			id: 'inline-vs-banner',
			title: 'Inline or banner layout',
			paragraphs: [
				'`inline` pairs `RuiAlertIcon` with a short message for compact status inside forms or page flow.',
				'`banner` spans the full width of a region with `RuiAlertTitle` and `RuiAlertDescription` — omit the icon for the accent-rail layout.',
			],
		},
	],
	accessibility: [
		'Alerts render with `role="alert"` so screen readers announce them when they appear.',
		'For inline alerts, pair `RuiAlertIcon` with text — do not rely on color alone to convey severity.',
		'For banner alerts, use `RuiAlertTitle` for the headline and `RuiAlertDescription` for supporting detail.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'inline',
				label: 'Inline message',
				props: {
					layout: 'inline',
					variant: 'info',
				},
				controls: [
					selectControl({
						prop: 'variant',
						label: 'Variant',
						defaultValue: 'info',
						options: [
							{
								value: 'info',
								label: 'Info',
							},
							{
								value: 'success',
								label: 'Success',
							},
							{
								value: 'warning',
								label: 'Warning',
							},
							{
								value: 'error',
								label: 'Error',
							},
						],
					}),
					textControl({
						prop: 'message',
						label: 'Message',
						defaultValue: 'Your session will expire in 5 minutes.',
					}),
				],
			}),
			defineScenario({
				id: 'banner',
				label: 'Banner advisory',
				props: {
					layout: 'banner',
					variant: 'info',
				},
				controls: [
					selectControl({
						prop: 'variant',
						label: 'Variant',
						defaultValue: 'info',
						options: [
							{
								value: 'info',
								label: 'Info',
							},
							{
								value: 'success',
								label: 'Success',
							},
							{
								value: 'warning',
								label: 'Warning',
							},
							{
								value: 'error',
								label: 'Error',
							},
						],
					}),
					textControl({
						prop: 'title',
						label: 'Title',
						defaultValue: 'Documentation preview',
					}),
					textControl({
						prop: 'description',
						label: 'Description',
						defaultValue: 'This release includes breaking changes to the routing API.',
					}),
				],
			}),
		],
	}),
});
