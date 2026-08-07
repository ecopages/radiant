function str(props: Record<string, unknown>, key: string, fallback = ''): string {
	const value = props[key];
	return value == null ? fallback : String(value);
}

function buildAlertExampleCode(props: Record<string, unknown>, children?: string): string {
	const variant = str(props, 'variant', 'info');
	const layout = str(props, 'layout', 'inline');

	if (layout === 'banner') {
		const title = str(props, 'title', 'Documentation preview');
		const description = str(props, 'description', 'This release includes breaking changes to the routing API.');
		return [
			"import { RuiAlert, RuiAlertTitle, RuiAlertDescription } from '@ecopages/radiant-ui/alert';",
			'',
			`<RuiAlert variant="${variant}" layout="banner">`,
			`  <RuiAlertTitle>${title}</RuiAlertTitle>`,
			'  <RuiAlertDescription>',
			`    <p>${description}</p>`,
			'  </RuiAlertDescription>',
			'</RuiAlert>',
		].join('\n');
	}

	const message = str(props, 'message', children ?? 'Your session will expire in 5 minutes.');
	return [
		"import { RuiAlert, RuiAlertIcon } from '@ecopages/radiant-ui/alert';",
		'',
		`<RuiAlert variant="${variant}" layout="inline">`,
		`  <RuiAlertIcon variant="${variant}" />`,
		`  <span>${message}</span>`,
		'</RuiAlert>',
	].join('\n');
}

/**
 * Tailored example source for composable components whose markup cannot be inferred from props alone.
 */
export function buildPlaygroundExampleCode(
	slug: string,
	props: Record<string, unknown>,
	_children?: string,
): string | null {
	switch (slug) {
		case 'alert':
			return buildAlertExampleCode(props);
		default:
			return null;
	}
}
