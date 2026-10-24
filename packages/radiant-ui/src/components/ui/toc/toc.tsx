import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiToc as RuiTocElement, RuiTocProps } from './toc.script';
import './toc.script';
import type { WithoutChildren } from '../../../lib/without-children';

/** The `<rui-toc>` element renders the jump-link list, so the view takes no children. */
export type RuiTocViewProps = WithoutChildren<JsxCustomElementAttributes<RuiTocElement, RuiTocProps>>;

export function RuiToc(props: RuiTocViewProps) {
	return <rui-toc {...props} />;
}
