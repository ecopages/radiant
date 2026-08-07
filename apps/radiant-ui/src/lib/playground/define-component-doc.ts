import { definePlayground } from './playground';
import type { ComponentDoc } from './types';

type ComponentDocInput = Omit<ComponentDoc, 'playground'> & {
	playground: ReturnType<typeof definePlayground>;
};

/** Declares component docs and playground scenarios for a component page. */
export function defineComponentDoc(doc: ComponentDocInput): ComponentDoc {
	return doc;
}
