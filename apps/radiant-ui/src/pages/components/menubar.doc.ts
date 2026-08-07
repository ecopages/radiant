import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	textControl
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: "menubar",
	title: "Menubar",
	exportName: "RuiMenubar",
	category: "Navigation",
	lede: "Menubars provide persistent top-level menus — File, Edit, View — with keyboard traversal across items.",
	usage: {
		intro: "Place menu triggers as children of `RuiMenubar`. Set `label` to name the menubar landmark.",
		example: `import { RuiMenubar } from '@ecopages/radiant-ui/menubar';
import { RuiMenuButton } from '@ecopages/radiant-ui/menu-button';

<RuiMenubar label="Application menu">
  <RuiMenuButton items={fileItems}>File</RuiMenuButton>
  <RuiMenuButton items={editItems}>Edit</RuiMenuButton>
</RuiMenubar>`,
	},
	guidance: [
  {
    id: "desktop-patterns",
    title: "Desktop application patterns",
    paragraphs: [
      "Menubars suit desktop-style apps. For site navigation, prefer `RuiNavigationMenu` or `RuiSidebar`."
    ],
  },
	],
	accessibility: [
   "Menubar renders with `role=\"menubar\"` and supports arrow-key traversal between top-level items.",
   "Each menu item opens a submenu with standard menu keyboard patterns.",
   "Provide `label` so the region is announced to screen reader users."
 ],
	playground: definePlayground({
		scenarios: [
   defineScenario({
     id: "default",
     label: "Default",
     controls: [
       textControl({
  prop: "label",
  label: "Accessible name",
  defaultValue: "Application menu"
})
     ]
   }),
		],
	}),
});
