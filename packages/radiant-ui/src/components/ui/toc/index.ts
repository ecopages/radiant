import type { WithoutChildren } from '../../../lib/without-children';
import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiToc as RuiTocElement, RuiTocProps } from './toc.script';

export { RuiToc, RuiToc as RuiTocElement, type RuiTocProps } from './toc.script';

/** Props for consumers that still use the former `RuiToc` view export. */
export type RuiTocViewProps = WithoutChildren<JsxCustomElementAttributes<RuiTocElement, RuiTocProps>>;
