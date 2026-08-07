import { defineComponentDoc, definePlayground, defineScenario, textControl } from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'breadcrumb',
	title: 'Breadcrumb',
	exportName: 'RuiBreadcrumb',
	category: 'Navigation',
	lede: 'Breadcrumbs show where the current page sits in a hierarchy. They help users backtrack without relying on the browser history alone.',
	usage: {
		intro: 'Compose the trail with `RuiBreadcrumbList`, `RuiBreadcrumbItem`, `RuiBreadcrumbLink`, and `RuiBreadcrumbPage` for the current location.',
		example: `import {
  RuiBreadcrumb,
  RuiBreadcrumbList,
  RuiBreadcrumbItem,
  RuiBreadcrumbLink,
  RuiBreadcrumbPage,
  RuiBreadcrumbSeparator,
} from '@ecopages/radiant-ui/breadcrumb';

<RuiBreadcrumb label="Breadcrumb">
  <RuiBreadcrumbList>
    <RuiBreadcrumbItem><RuiBreadcrumbLink href="/docs">Docs</RuiBreadcrumbLink></RuiBreadcrumbItem>
    <RuiBreadcrumbSeparator />
    <RuiBreadcrumbItem><RuiBreadcrumbPage>Components</RuiBreadcrumbPage></RuiBreadcrumbItem>
  </RuiBreadcrumbList>
</RuiBreadcrumb>`,
	},
	guidance: [
		{
			id: 'current-page',
			title: 'Mark the current page',
			paragraphs: [
				'The last item should use `RuiBreadcrumbPage`, not a link. Earlier segments link to ancestor routes.',
			],
		},
		{
			id: 'truncate-long-trails',
			title: 'Truncate long trails',
			paragraphs: [
				'When the hierarchy is deep, collapse middle segments with `RuiBreadcrumbEllipsis` and expose the full path on demand.',
			],
		},
	],
	accessibility: [
		'The root element renders as a `nav` landmark with an accessible name from the `label` prop.',
		'The current page is indicated with `aria-current="page"`.',
		'Separators are hidden from assistive technologies with `aria-hidden`.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: [
					textControl({
						prop: 'label',
						label: 'Accessible name',
						defaultValue: 'Breadcrumb',
					}),
					textControl({
						prop: 'separator',
						label: 'Separator',
						defaultValue: '/',
					}),
				],
			}),
		],
	}),
});
