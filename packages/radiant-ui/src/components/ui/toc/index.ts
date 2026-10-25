import type { WithoutChildren } from '../../../lib/without-children';
import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiToc as RuiTocElement, RuiTocProps } from './toc.script';

export { RuiToc, RuiToc as RuiTocElement, type RuiTocProps } from './toc.script';

/** @deprecated `RuiToc` is now the custom-element class. Use `RuiTocProps` for its JSX props. */
export type RuiTocViewProps = WithoutChildren<JsxCustomElementAttributes<RuiTocElement, RuiTocProps>>;
