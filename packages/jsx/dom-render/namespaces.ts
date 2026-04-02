export const HTML_NAMESPACE_URI = 'http://www.w3.org/1999/xhtml';
export const SVG_NAMESPACE_URI = 'http://www.w3.org/2000/svg';
const XLINK_NAMESPACE_URI = 'http://www.w3.org/1999/xlink';
const XLINK_PREFIX = 'xlink:';

export function getChildNamespace(parentNamespace: string | null | undefined, parentLocalName?: string): string {
	if (parentNamespace !== SVG_NAMESPACE_URI) {
		return parentNamespace ?? HTML_NAMESPACE_URI;
	}

	return parentLocalName === 'foreignObject' || parentLocalName === 'foreignobject'
		? HTML_NAMESPACE_URI
		: SVG_NAMESPACE_URI;
}

export function getElementAttributeValue(element: Element, name: string): string | null {
	const localName = getXlinkLocalName(name);

	if (!localName) {
		return element.getAttribute(name);
	}

	return element.getAttributeNS(XLINK_NAMESPACE_URI, localName);
}

export function setElementAttributeValue(element: Element, name: string, value: string): void {
	const localName = getXlinkLocalName(name);

	if (!localName) {
		element.setAttribute(name, value);
		return;
	}

	element.setAttributeNS(XLINK_NAMESPACE_URI, name, value);
}

export function removeElementAttribute(element: Element, name: string): void {
	const localName = getXlinkLocalName(name);

	if (!localName) {
		element.removeAttribute(name);
		return;
	}

	element.removeAttributeNS(XLINK_NAMESPACE_URI, localName);
}

function getXlinkLocalName(name: string): string | undefined {
	if (!name.startsWith(XLINK_PREFIX)) {
		return undefined;
	}

	const localName = name.slice(XLINK_PREFIX.length);
	return localName === '' ? undefined : localName;
}
