import {
	RuiSidebar,
	type RuiSidebarCollapsible,
	RuiSidebarContent,
	RuiSidebarGroup,
	RuiSidebarGroupHeader,
	RuiSidebarInset,
	RuiSidebarMenu,
	RuiSidebarMenuButton,
	RuiSidebarMenuItem,
	RuiSidebarProvider,
	type RuiSidebarSide,
	RuiSidebarTrigger,
} from '@ecopages/radiant-ui/sidebar';
import { docsStory, type DocsMeta, type DocsStory } from '@/lib/docs-stories';

const SIDEBAR_ID = 'playground-sidebar';

export type SidebarArgs = {
	collapsible: RuiSidebarCollapsible;
	side: RuiSidebarSide;
	defaultOpen: boolean;
	resizable: boolean;
	defaultWidth: number;
};

export const meta = {
	args: {
		collapsible: 'off',
		side: 'left',
		defaultOpen: true,
		resizable: false,
		defaultWidth: 256,
	},
	argTypes: {
		collapsible: {
			control: { type: 'select' },
			options: ['off', 'icon', 'full'] as const satisfies readonly RuiSidebarCollapsible[],
		},
		side: { control: { type: 'select' }, options: ['left', 'right'] as const satisfies readonly RuiSidebarSide[] },
		defaultOpen: { control: { type: 'boolean' } },
		resizable: { control: { type: 'boolean' } },
		defaultWidth: { control: { type: 'number' } },
	},
	render: (args) => (
		<div class="playground-sidebar-demo">
			<RuiSidebarProvider
				sidebar={
					<RuiSidebar
						id={SIDEBAR_ID}
						collapsible={args.collapsible}
						side={args.side}
						defaultOpen={args.defaultOpen}
						resizable={args.resizable}
						defaultWidth={args.defaultWidth}
						mobileBreakpoint={768}
						label="Workspace"
					>
						<RuiSidebarContent aria-label="Primary navigation">
							<RuiSidebarGroup aria-label="Workspace">
								<RuiSidebarGroupHeader label="Workspace" />
								<RuiSidebarMenu aria-label="Workspace links">
									<RuiSidebarMenuItem>
										<RuiSidebarMenuButton as="a" href="#" isActive>
											Dashboard
										</RuiSidebarMenuButton>
									</RuiSidebarMenuItem>
									<RuiSidebarMenuItem>
										<RuiSidebarMenuButton as="a" href="#">
											Projects
										</RuiSidebarMenuButton>
									</RuiSidebarMenuItem>
									<RuiSidebarMenuItem>
										<RuiSidebarMenuButton as="a" href="#">
											Team
										</RuiSidebarMenuButton>
									</RuiSidebarMenuItem>
								</RuiSidebarMenu>
							</RuiSidebarGroup>
						</RuiSidebarContent>
					</RuiSidebar>
				}
			>
				<RuiSidebarInset>
					<div class="playground-sidebar-demo__main">
						<RuiSidebarTrigger controls={SIDEBAR_ID} triggerLabel="Toggle sidebar" />
						<p class="playground-sidebar-demo__copy">Main content area beside the sidebar.</p>
					</div>
				</RuiSidebarInset>
			</RuiSidebarProvider>
		</div>
	),
} satisfies DocsMeta<SidebarArgs>;

type Story = DocsStory<SidebarArgs>;

export const Default: Story = docsStory(meta, { parameters: { docs: { id: 'sidebar/default' } } });
