import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiToc as RuiTocElement, RuiTocProps } from './toc.script';
import './toc.script';

/** The `<rui-toc>` element renders the jump-link list, so the view takes no children. */
export type RuiTocViewProps = JsxCustomElementAttributes<RuiTocElement, RuiTocProps> & { children?: never };

export function RuiToc(props: RuiTocViewProps) {
	return <rui-toc {...props} />;
}
