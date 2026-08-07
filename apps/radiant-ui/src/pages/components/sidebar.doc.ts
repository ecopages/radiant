import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	booleanControl,
	numberControl,
	selectControl,
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: 'sidebar',
	title: 'Sidebar',
	exportName: 'RuiSidebar',
	category: 'Navigation',
	lede: 'Sidebars provide persistent app navigation with collapsible, resizable, and mobile-responsive layouts.',
	usage: {
		intro: 'Wrap the layout in `RuiSidebarProvider`. Compose header, content, groups, and menu items with the sidebar sub-components.',
		example: `import {
  RuiSidebarProvider,
  RuiSidebar,
  RuiSidebarHeader,
  RuiSidebarContent,
  RuiSidebarMenu,
  RuiSidebarMenuItem,
  RuiSidebarMenuButton,
  RuiSidebarInset,
  RuiSidebarTrigger,
} from '@ecopages/radiant-ui/sidebar';

<RuiSidebarProvider>
  <RuiSidebar collapsible="icon" defaultOpen>
    <RuiSidebarHeader>Acme</RuiSidebarHeader>
    <RuiSidebarContent>
      <RuiSidebarMenu>
        <RuiSidebarMenuItem>
          <RuiSidebarMenuButton href="/dashboard">Dashboard</RuiSidebarMenuButton>
        </RuiSidebarMenuItem>
      </RuiSidebarMenu>
    </RuiSidebarContent>
  </RuiSidebar>
  <RuiSidebarInset>
    <RuiSidebarTrigger />
    <main>Page content</main>
  </RuiSidebarInset>
</RuiSidebarProvider>`,
	},
	guidance: [
		{
			id: 'collapsible-modes',
			title: 'Collapsible modes',
			paragraphs: [
				'`icon` collapses to icons only. `full` hides the sidebar entirely. `off` keeps it always visible.',
			],
		},
		{
			id: 'active-matching',
			title: 'Active route matching',
			paragraphs: [
				'Enable `matchActive` with `matchMode` to highlight the current page in the menu automatically.',
			],
		},
	],
	accessibility: [
		'The sidebar renders as a `nav` landmark with `label` as its accessible name.',
		'Collapsed icon-only mode preserves accessible names on menu buttons.',
		'The trigger button exposes whether the sidebar is expanded or collapsed.',
	],
	playground: definePlayground({
		scenarios: [
			defineScenario({
				id: 'default',
				label: 'Default',
				controls: [
					selectControl({
						prop: 'collapsible',
						label: 'Collapsible',
						defaultValue: 'off',
						options: [
							{
								value: 'off',
								label: 'Off',
							},
							{
								value: 'icon',
								label: 'Icon',
							},
							{
								value: 'full',
								label: 'Full',
							},
						],
					}),
					selectControl({
						prop: 'side',
						label: 'Side',
						defaultValue: 'left',
						options: [
							{
								value: 'left',
								label: 'Left',
							},
							{
								value: 'right',
								label: 'Right',
							},
						],
					}),
					booleanControl({
						prop: 'defaultOpen',
						label: 'Default open',
						defaultValue: true,
					}),
					booleanControl({
						prop: 'resizable',
						label: 'Resizable',
						defaultValue: false,
					}),
					numberControl({
						prop: 'defaultWidth',
						label: 'Default width',
						defaultValue: 256,
						min: 200,
						max: 480,
						step: 8,
					}),
				],
			}),
		],
	}),
});
