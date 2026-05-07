import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const docsDir = import.meta.dir;
const repoRoot = path.resolve(docsDir, '..', '..', '..');
const runtimeBundleServicePath = path.join(
	repoRoot,
	'node_modules',
	'@ecopages',
	'ecopages-jsx',
	'src',
	'services',
	'jsx-runtime-bundle.service.js',
);
const jsxRuntimeDistPath = path.join(repoRoot, 'packages', 'jsx', 'dist', 'index.js');

const runtimeBundleServiceSource = readFileSync(runtimeBundleServicePath, 'utf8');
const jsxRuntimeDistSource = readFileSync(jsxRuntimeDistPath, 'utf8');

const namespaceRepairIdentifiersPattern =
	/function (?<normalize>[A-Za-z0-9$]+)\(W,G,J\)\{let j=G instanceof Element\?G:G\?\.parentElement,U=j\?\.namespaceURI\?\?(?<htmlNamespace>[A-Za-z0-9$]+),\$=j\?\.localName,X=W\.firstElementChild;if\(!X\)return;let F=J\?\?X\.localName,Z=(?<getElementNamespace>[A-Za-z0-9$]+)\(U,\$,F\);if\(X\.namespaceURI===Z&&X\.localName===F\)return;W\.replaceChild\((?<recreateCall>[A-Za-z0-9$]+)\(X,Z,F\),X\)\}function (?<recreate>[A-Za-z0-9$]+)\(W,G,J\)\{let j=document\.createElementNS\(G,J\);for\(let U of Array\.from\(W\.attributes\)\)\{if\(U\.namespaceURI\)\{j\.setAttributeNS\(U\.namespaceURI,U\.name,U\.value\);continue\}(?<setAttribute>[A-Za-z0-9$]+)\(j,U\.name,U\.value\)\}return j\.append\(\.\.\.W\.childNodes\),j\}/;

const snippetMatch = jsxRuntimeDistSource.match(namespaceRepairIdentifiersPattern);

if (!snippetMatch) {
	throw new Error('Could not extract the namespace repair snippet from packages/jsx/dist/index.js');
}

if (!snippetMatch?.groups) {
	throw new Error('Could not extract namespace repair helper identifiers from packages/jsx/dist/index.js');
}

const {
	normalize: normalizeFunctionName,
	htmlNamespace: htmlNamespaceIdentifier,
	getElementNamespace: getElementNamespaceIdentifier,
	recreate: recreateFunctionName,
	recreateCall: recreateFunctionCallName,
	setAttribute: setAttributeFunctionName,
} = snippetMatch.groups;

if (recreateFunctionName !== recreateFunctionCallName) {
	throw new Error('Namespace repair snippet uses mismatched recreation helper names');
}

const nextSnippetAssignment = `const JSX_RUNTIME_NAMESPACE_REPAIR_SNIPPET = ${JSON.stringify(snippetMatch[0])};`;
const nextPatchAssignment = `const JSX_RUNTIME_NAMESPACE_REPAIR_PATCH = ${JSON.stringify(
	[
		"const eopHtmlNamespace='http://www.w3.org/1999/xhtml',eopSvgNamespace='http://www.w3.org/2000/svg',eopCanonicalSvgLocalNames={altglyph:'altGlyph',altglyphdef:'altGlyphDef',altglyphitem:'altGlyphItem',animatemotion:'animateMotion',animatetransform:'animateTransform',clippath:'clipPath',feblend:'feBlend',fecolormatrix:'feColorMatrix',fecomponenttransfer:'feComponentTransfer',fecomposite:'feComposite',feconvolvematrix:'feConvolveMatrix',fediffuselighting:'feDiffuseLighting',fedisplacementmap:'feDisplacementMap',fedistantlight:'feDistantLight',fedropshadow:'feDropShadow',feflood:'feFlood',fefunca:'feFuncA',fefuncb:'feFuncB',fefuncg:'feFuncG',fefuncr:'feFuncR',fegaussianblur:'feGaussianBlur',feimage:'feImage',femerge:'feMerge',femergenode:'feMergeNode',femorphology:'feMorphology',feoffset:'feOffset',fepointlight:'fePointLight',fespecularlighting:'feSpecularLighting',fespotlight:'feSpotLight',fetile:'feTile',feturbulence:'feTurbulence',foreignobject:'foreignObject',glyphref:'glyphRef',lineargradient:'linearGradient',radialgradient:'radialGradient',textpath:'textPath'};",
		'function eopGetCanonicalSvgLocalName(W){return eopCanonicalSvgLocalNames[W]??W}',
		'function eopIsSvgNamespace(W){return W===eopSvgNamespace}',
		`function ${normalizeFunctionName}(W,G,J){let j=G instanceof Element?G:G?.parentElement,U=j?.namespaceURI??${htmlNamespaceIdentifier},$=j?.localName;eopRepairNamespaceFragment(W,U??eopHtmlNamespace,$,J)}`,
		`function eopRepairNamespaceFragment(W,G,J,j){let U=W.firstElementChild;if(!U)return;let $=j??U.localName,X=${getElementNamespaceIdentifier}(G,J,$),F=eopIsSvgNamespace(X)?eopGetCanonicalSvgLocalName($):$;eopRepairNamespaceElement(W,U,X,F)}`,
		`function eopRepairNamespaceElement(W,G,J,j){let U=G;if(G.namespaceURI!==J||G.localName!==j)U=${recreateFunctionName}(G,J,j),W.replaceChild(U,G);eopRepairNamespaceChildren(U,J,j)}`,
		`function eopRepairNamespaceChildren(W,G,J){for(let j of Array.from(W.children)){let U=${getElementNamespaceIdentifier}(G,J,j.localName),$=eopIsSvgNamespace(U)?eopGetCanonicalSvgLocalName(j.localName):j.localName,X=j;if(j.namespaceURI!==U||j.localName!==$)X=${recreateFunctionName}(j,U,$),W.replaceChild(X,j);eopRepairNamespaceChildren(X,U,$)}}`,
		`function ${recreateFunctionName}(W,G,J){let j=document.createElementNS(G,eopIsSvgNamespace(G)?eopGetCanonicalSvgLocalName(J):J);for(let U of Array.from(W.attributes)){if(U.namespaceURI){j.setAttributeNS(U.namespaceURI,U.name,U.value);continue}${setAttributeFunctionName}(j,U.name,U.value)}return j.append(...W.childNodes),j}`,
	].join(''),
)};`;
const snippetAssignmentStart = 'const JSX_RUNTIME_NAMESPACE_REPAIR_SNIPPET = ';
const patchAssignmentStart = 'const JSX_RUNTIME_NAMESPACE_REPAIR_PATCH = ';

const snippetAssignmentStartIndex = runtimeBundleServiceSource.indexOf(snippetAssignmentStart);
const snippetAssignmentEndIndex = runtimeBundleServiceSource.indexOf(patchAssignmentStart, snippetAssignmentStartIndex);

if (snippetAssignmentStartIndex === -1 || snippetAssignmentEndIndex === -1) {
	throw new Error('Could not find JSX_RUNTIME_NAMESPACE_REPAIR_SNIPPET in @ecopages/ecopages-jsx');
}

const nextRuntimeBundleServiceSource =
	runtimeBundleServiceSource.slice(0, snippetAssignmentStartIndex) +
	nextSnippetAssignment +
	runtimeBundleServiceSource.slice(snippetAssignmentEndIndex);

const patchAssignmentEnd = '\nfunction getNamedExportNamesFromModuleSource(source) {';

const patchAssignmentStartIndex = nextRuntimeBundleServiceSource.indexOf(patchAssignmentStart);
const patchAssignmentEndIndex = nextRuntimeBundleServiceSource.indexOf(patchAssignmentEnd, patchAssignmentStartIndex);

if (patchAssignmentStartIndex === -1 || patchAssignmentEndIndex === -1) {
	throw new Error('Could not find JSX_RUNTIME_NAMESPACE_REPAIR_PATCH in @ecopages/ecopages-jsx');
}

const nextPatchedRuntimeBundleServiceSource =
	nextRuntimeBundleServiceSource.slice(0, patchAssignmentStartIndex) +
	nextPatchAssignment +
	nextRuntimeBundleServiceSource.slice(patchAssignmentEndIndex);

if (nextPatchedRuntimeBundleServiceSource !== runtimeBundleServiceSource) {
	writeFileSync(runtimeBundleServicePath, nextPatchedRuntimeBundleServiceSource, 'utf8');
	console.log('[patch-jsx-runtime-bundle] Updated Ecopages JSX runtime bundle snippet for the local dist output');
	process.exit(0);
}

console.log('[patch-jsx-runtime-bundle] Ecopages JSX runtime bundle snippet already matches the local dist output');
