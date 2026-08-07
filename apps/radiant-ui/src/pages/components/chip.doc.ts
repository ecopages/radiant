import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	selectControl
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: "chip",
	title: "Chip",
	exportName: "RuiChip",
	category: "Data display",
	lede: "Chips represent compact entities — tags, filters, or status markers — in a pill-shaped container that reads at a glance.",
	usage: {
		intro: "Choose a `variant` to match emphasis. Chips are presentational; pair them with `RuiChipList` when displaying a collection.",
		example: `import { RuiChip } from '@ecopages/radiant-ui/chip';

<RuiChip variant="primary">Design system</RuiChip>`,
	},
	guidance: [
  {
    id: "variant-emphasis",
    title: "Variant emphasis",
    paragraphs: [
      "`default` suits neutral metadata. `muted` recedes in dense lists. `primary` highlights an active filter or category."
    ],
  },
	],
	accessibility: [
   "Keep chip text short and self-explanatory — avoid abbreviations that need a legend.",
   "When chips are interactive, use a button or link with an accessible name instead of a static chip.",
   "Do not rely on chip color alone to convey status; include descriptive text."
 ],
	playground: definePlayground({
		scenarios: [
   defineScenario({
     id: "default",
     label: "Default",
     controls: [
       selectControl({
  prop: "variant",
  label: "Variant",
  defaultValue: "default",
  options: [
    {
      value: "default",
      label: "Default"
    },
    {
      value: "muted",
      label: "Muted"
    },
    {
      value: "primary",
      label: "Primary"
    }
  ]
})
     ],
     children: "Design system"
   }),
		],
	}),
});
