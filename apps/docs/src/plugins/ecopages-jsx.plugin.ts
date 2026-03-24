import { IntegrationPlugin } from '@ecopages/core/plugins/integration-plugin';
import { EcopagesJsxRenderer } from './ecopages-jsx-renderer';

/** Local docs-only JSX integration for `.tsx` templates. */
export class EcopagesJsxPlugin extends IntegrationPlugin {
	renderer = EcopagesJsxRenderer;

	constructor() {
		super({
			name: 'ecopages-jsx',
			extensions: ['.tsx'],
		});
	}
}

export const ecopagesJsxPlugin = () => new EcopagesJsxPlugin();