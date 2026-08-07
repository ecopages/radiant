import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	booleanControl,
	textControl
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: "feed",
	title: "Feed",
	exportName: "RuiFeed",
	category: "Data display",
	lede: "Feeds structure a stream of articles or activity items with consistent header, content, and action regions.",
	usage: {
		intro: "Use `RuiFeedArticle` for each item. Compose bylines, metadata, and actions with the dedicated sub-components.",
		example: `import {
  RuiFeed,
  RuiFeedArticle,
  RuiFeedArticleHeader,
  RuiFeedArticleContent,
  RuiFeedByline,
} from '@ecopages/radiant-ui/feed';

<RuiFeed label="Activity">
  <RuiFeedArticle>
    <RuiFeedArticleHeader>
      <RuiFeedByline>Jane Cooper · 2 hours ago</RuiFeedByline>
    </RuiFeedArticleHeader>
    <RuiFeedArticleContent>Shipped order #4821.</RuiFeedArticleContent>
  </RuiFeedArticle>
</RuiFeed>`,
	},
	guidance: [
  {
    id: "article-structure",
    title: "Consistent article structure",
    paragraphs: [
      "Keep header, content, and actions in the same order across items so users can scan the feed quickly."
    ],
  },
  {
    id: "loading-state",
    title: "Loading state",
    paragraphs: [
      "Set `aria-busy` on the feed while fetching new items so assistive technologies announce the update."
    ],
  },
	],
	accessibility: [
   "Label the feed region with the `label` prop or an external heading.",
   "Each article should have a discernible title or summary in the header.",
   "Action buttons inside articles need descriptive labels, not just icons."
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
  defaultValue: "Activity"
}),
       booleanControl({
  prop: "aria-busy",
  label: "Busy",
  defaultValue: false
})
     ]
   }),
		],
	}),
});
