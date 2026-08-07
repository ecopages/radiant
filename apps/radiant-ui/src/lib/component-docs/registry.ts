import type { ComponentDoc } from '@/lib/playground';

import { componentDoc as alertDoc } from '@/pages/components/alert.doc';
import { componentDoc as autocompleteDoc } from '@/pages/components/autocomplete.doc';
import { componentDoc as avatarDoc } from '@/pages/components/avatar.doc';
import { componentDoc as breadcrumbDoc } from '@/pages/components/breadcrumb.doc';
import { componentDoc as buttonGroupDoc } from '@/pages/components/button-group.doc';
import { componentDoc as buttonDoc } from '@/pages/components/button.doc';
import { componentDoc as calendarDoc } from '@/pages/components/calendar.doc';
import { componentDoc as carouselDoc } from '@/pages/components/carousel.doc';
import { componentDoc as checkboxDoc } from '@/pages/components/checkbox.doc';
import { componentDoc as chipListDoc } from '@/pages/components/chip-list.doc';
import { componentDoc as chipDoc } from '@/pages/components/chip.doc';
import { componentDoc as comboboxDoc } from '@/pages/components/combobox.doc';
import { componentDoc as dateFieldDoc } from '@/pages/components/date-field.doc';
import { componentDoc as dateRangePickerDoc } from '@/pages/components/date-range-picker.doc';
import { componentDoc as dialogDoc } from '@/pages/components/dialog.doc';
import { componentDoc as disclosureDoc } from '@/pages/components/disclosure.doc';
import { componentDoc as feedDoc } from '@/pages/components/feed.doc';
import { componentDoc as fieldDoc } from '@/pages/components/field.doc';
import { componentDoc as formDoc } from '@/pages/components/form.doc';
import { componentDoc as gridDoc } from '@/pages/components/grid.doc';
import { componentDoc as headingDoc } from '@/pages/components/heading.doc';
import { componentDoc as headlineDoc } from '@/pages/components/headline.doc';
import { componentDoc as inputDoc } from '@/pages/components/input.doc';
import { componentDoc as labelDoc } from '@/pages/components/label.doc';
import { componentDoc as listboxDoc } from '@/pages/components/listbox.doc';
import { componentDoc as menuButtonDoc } from '@/pages/components/menu-button.doc';
import { componentDoc as menubarDoc } from '@/pages/components/menubar.doc';
import { componentDoc as meterDoc } from '@/pages/components/meter.doc';
import { componentDoc as navigationMenuDoc } from '@/pages/components/navigation-menu.doc';
import { componentDoc as numberFieldDoc } from '@/pages/components/number-field.doc';
import { componentDoc as popoverDoc } from '@/pages/components/popover.doc';
import { componentDoc as radioGroupDoc } from '@/pages/components/radio-group.doc';
import { componentDoc as selectDoc } from '@/pages/components/select.doc';
import { componentDoc as sidebarDoc } from '@/pages/components/sidebar.doc';
import { componentDoc as sliderDoc } from '@/pages/components/slider.doc';
import { componentDoc as switchDoc } from '@/pages/components/switch.doc';
import { componentDoc as tabsDoc } from '@/pages/components/tabs.doc';
import { componentDoc as tagGroupDoc } from '@/pages/components/tag-group.doc';
import { componentDoc as textareaDoc } from '@/pages/components/textarea.doc';
import { componentDoc as toastDoc } from '@/pages/components/toast.doc';
import { componentDoc as tocDoc } from '@/pages/components/toc.doc';
import { componentDoc as toolbarDoc } from '@/pages/components/toolbar.doc';
import { componentDoc as tooltipDoc } from '@/pages/components/tooltip.doc';
import { componentDoc as treeDoc } from '@/pages/components/tree.doc';
import { componentDoc as treegridDoc } from '@/pages/components/treegrid.doc';
import { componentDoc as windowSplitterDoc } from '@/pages/components/window-splitter.doc';

export const componentDocs: ComponentDoc[] = [
	alertDoc,
	autocompleteDoc,
	avatarDoc,
	breadcrumbDoc,
	buttonGroupDoc,
	buttonDoc,
	calendarDoc,
	carouselDoc,
	checkboxDoc,
	chipListDoc,
	chipDoc,
	comboboxDoc,
	dateFieldDoc,
	dateRangePickerDoc,
	dialogDoc,
	disclosureDoc,
	feedDoc,
	fieldDoc,
	formDoc,
	gridDoc,
	headingDoc,
	headlineDoc,
	inputDoc,
	labelDoc,
	listboxDoc,
	menuButtonDoc,
	menubarDoc,
	meterDoc,
	navigationMenuDoc,
	numberFieldDoc,
	popoverDoc,
	radioGroupDoc,
	selectDoc,
	sidebarDoc,
	sliderDoc,
	switchDoc,
	tabsDoc,
	tagGroupDoc,
	textareaDoc,
	toastDoc,
	tocDoc,
	toolbarDoc,
	tooltipDoc,
	treeDoc,
	treegridDoc,
	windowSplitterDoc,
];

export function getComponentDoc(slug: string): ComponentDoc | undefined {
	return componentDocs.find((entry) => entry.slug === slug);
}
