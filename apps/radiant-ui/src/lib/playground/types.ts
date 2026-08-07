export type ComponentCategory =
	| 'Actions'
	| 'Forms'
	| 'Layout'
	| 'Navigation'
	| 'Overlays'
	| 'Feedback'
	| 'Data display';

export type PlaygroundControl =
	| {
			kind: 'select';
			prop: string;
			label: string;
			description?: string;
			options: { value: string; label: string }[];
			defaultValue: string;
	  }
	| {
			kind: 'boolean';
			prop: string;
			label: string;
			description?: string;
			defaultValue: boolean;
	  }
	| {
			kind: 'text';
			prop: string;
			label: string;
			description?: string;
			defaultValue: string;
	  }
	| {
			kind: 'number';
			prop: string;
			label: string;
			description?: string;
			defaultValue: number;
			min?: number;
			max?: number;
			step?: number;
	  };

export type ComponentGuidanceSection = {
	id: string;
	title: string;
	paragraphs: string[];
	bullets?: string[];
};

/** Named playground preset with its own controls and default props. */
export type PlaygroundScenario = {
	id: string;
	label: string;
	props?: Record<string, string | number | boolean>;
	controls?: PlaygroundControl[];
	children?: string;
};

export type PlaygroundConfig = {
	scenarios: PlaygroundScenario[];
};

export type ComponentDoc = {
	slug: string;
	title: string;
	exportName: string;
	category: ComponentCategory;
	lede: string;
	usage: {
		intro: string;
		example: string;
	};
	guidance: ComponentGuidanceSection[];
	accessibility: string[];
	playground: PlaygroundConfig;
};

export type ResolvedPlaygroundState = {
	scenarioId: string;
	controls: PlaygroundControl[];
	props: Record<string, unknown>;
	children?: string;
};
