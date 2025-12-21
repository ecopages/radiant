import type { RadiantAccordionProps } from './accordion.script';
import './accordion.script';
import './accordion.css';

type AccordionItemProps = {
	id: string;
	title: string;
	children: JSX.Element;
	defaultOpen?: boolean;
};

const RadiantAccordionItem = ({ id, title, children, defaultOpen }: AccordionItemProps) => {
	return (
		<details data-id={id} open={defaultOpen}>
			<summary safe>{title}</summary>
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
