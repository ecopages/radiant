export function toDataAttributeName(property: string): string {
	return `data-${property.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
}

export function toDatasetPropertyName(attributeName: string): string {
	return attributeName.replace(/-([a-z])/g, (_match, character: string) => character.toUpperCase());
}
