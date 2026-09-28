import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import type { RuiToc as RuiTocElement, RuiTocProps } from './toc.script';
import './toc.script';

export type RuiTocViewProps = JsxCustomElementAttributes<RuiTocElement, RuiTocProps>;

export function RuiToc(props: RuiTocViewProps) {
	return <rui-toc {...props} />;
}
