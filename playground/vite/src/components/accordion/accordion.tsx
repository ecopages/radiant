import type { JsxRenderable } from '@ecopages/jsx';
import type { RadiantAccordionProps } from './accordion.script';
import './accordion.script';
import './accordion.css';

type AccordionItemProps = {
	id: string;
	title: string;
	children: JsxRenderable;
	defaultOpen?: boolean;
};

const RadiantAccordionItem = ({ id, title, children, defaultOpen }: AccordionItemProps) => {
	return (
		<details data-id={id} open={defaultOpen}>
			<summary>{title}</summary>
			<div data-ref="panel">{children}</div>
		</details>
	);
};

export const RadiantAccordion = ({
	multiple,
	shouldAnimate,
	items,
}: RadiantAccordionProps & {
	items: AccordionItemProps[];
}) => {
	return (
		<radiant-accordion multiple={multiple} shouldAnimate={shouldAnimate}>
			{items.map((item) => (
				<RadiantAccordionItem {...item} />
			))}
		</radiant-accordion>
	);
};
