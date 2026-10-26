/**
 * HTML raw-text elements: children are character data, not a node tree, and are not entity-escaped.
 *
 * @remarks The SSR serializer and Radiant's HTML parser share this set. Escapable raw-text
 * elements (`textarea`, `title`) stay entity-escaped and are not listed here.
 */
export const RAW_TEXT_ELEMENT_NAMES: ReadonlySet<string> = new Set([
	'script',
	'style',
	'xmp',
	'iframe',
	'noembed',
	'noframes',
]);
