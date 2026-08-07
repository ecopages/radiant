import {
	defineComponentDoc,
	definePlayground,
	defineScenario,
	booleanControl,
	numberControl,
	selectControl
} from '@/lib/playground';

export const componentDoc = defineComponentDoc({
	slug: "carousel",
	title: "Carousel",
	exportName: "RuiCarousel",
	category: "Data display",
	lede: "Carousels cycle through a set of panels — hero images, feature highlights, or onboarding steps — while keeping one slide in focus.",
	usage: {
		intro: "Place `RuiCarouselSlide` children inside `RuiCarousel`. Enable `autoplay` only when motion is not distracting and can be paused.",
		example: `import { RuiCarousel, RuiCarouselSlide, RuiCarouselPrev, RuiCarouselNext } from '@ecopages/radiant-ui/carousel';

<RuiCarousel index={0} transition="slide" showIndicators>
  <RuiCarouselSlide>First panel</RuiCarouselSlide>
  <RuiCarouselSlide>Second panel</RuiCarouselSlide>
  <RuiCarouselPrev />
  <RuiCarouselNext />
</RuiCarousel>`,
	},
	guidance: [
  {
    id: "autoplay-caution",
    title: "Use autoplay sparingly",
    paragraphs: [
      "Autoplaying carousels can disorient users and violate reduced-motion preferences. Prefer manual controls and expose `showRotationControl` when autoplay is on."
    ],
  },
  {
    id: "transitions",
    title: "Pick a transition",
    paragraphs: [
      "`slide` moves content horizontally. `fade` cross-fades panels. `none` swaps instantly — best when motion would be gratuitous."
    ],
  },
	],
	accessibility: [
   "Provide a descriptive `label` so screen readers identify the carousel region.",
   "Prev/next controls must be keyboard reachable and expose their purpose in the accessible name.",
   "Respect `prefers-reduced-motion` — avoid autoplay when users request reduced motion."
 ],
	playground: definePlayground({
		scenarios: [
   defineScenario({
     id: "default",
     label: "Default",
     controls: [
       numberControl({
  prop: "index",
  label: "Active index",
  defaultValue: 0,
  min: 0,
  max: 5,
  step: 1
}),
       selectControl({
  prop: "transition",
  label: "Transition",
  defaultValue: "slide",
  options: [
    {
      value: "none",
      label: "None"
    },
    {
      value: "slide",
      label: "Slide"
    },
    {
      value: "fade",
      label: "Fade"
    }
  ]
}),
       booleanControl({
  prop: "autoplay",
  label: "Autoplay",
  defaultValue: false
}),
       numberControl({
  prop: "interval",
  label: "Interval (ms)",
  defaultValue: 4000,
  min: 1000,
  max: 10000,
  step: 500
}),
       booleanControl({
  prop: "showIndicators",
  label: "Show indicators",
  defaultValue: false
}),
       booleanControl({
  prop: "loop",
  label: "Loop",
  defaultValue: true
})
     ]
   }),
		],
	}),
});
