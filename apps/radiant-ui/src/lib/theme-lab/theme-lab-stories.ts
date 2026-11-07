import type { DocsMetaAny, DocsStoryAny } from '@/lib/docs-stories';
import { meta as alertMeta, Default as alertDefault } from '@/content/stories/alert';
import { meta as autocompleteMeta, Default as autocompleteDefault } from '@/content/stories/autocomplete';
import { meta as avatarMeta, Default as avatarDefault } from '@/content/stories/avatar';
import { meta as badgeMeta, Default as badgeDefault } from '@/content/stories/badge';
import { meta as breadcrumbMeta, Default as breadcrumbDefault } from '@/content/stories/breadcrumb';
import { meta as buttonMeta, Default as buttonDefault } from '@/content/stories/button';
import { meta as buttonGroupMeta, Default as buttonGroupDefault } from '@/content/stories/button-group';
import { meta as calendarMeta, Default as calendarDefault } from '@/content/stories/calendar';
import { meta as carouselMeta, Default as carouselDefault } from '@/content/stories/carousel';
import { meta as checkboxMeta, Default as checkboxDefault } from '@/content/stories/checkbox';
import { meta as checkboxGroupMeta, Default as checkboxGroupDefault } from '@/content/stories/checkbox-group';
import { meta as chipMeta, Default as chipDefault } from '@/content/stories/chip';
import { meta as chipListMeta, Default as chipListDefault } from '@/content/stories/chip-list';
import { meta as comboboxMeta, Default as comboboxDefault } from '@/content/stories/combobox';
import { meta as cycleToggleMeta, Default as cycleToggleDefault } from '@/content/stories/cycle-toggle';
import { meta as dateFieldMeta, Default as dateFieldDefault } from '@/content/stories/date-field';
import { meta as dateInputMeta, Default as dateInputDefault } from '@/content/stories/date-input';
import { meta as dateRangePickerMeta, Default as dateRangePickerDefault } from '@/content/stories/date-range-picker';
import { meta as dialogMeta, Default as dialogDefault } from '@/content/stories/dialog';
import { meta as disclosureMeta, Default as disclosureDefault } from '@/content/stories/disclosure';
import { meta as feedMeta, Default as feedDefault } from '@/content/stories/feed';
import { meta as fieldMeta, Default as fieldDefault } from '@/content/stories/field';
import { meta as formMeta, Default as formDefault } from '@/content/stories/form';
import { meta as gridMeta, Default as gridDefault } from '@/content/stories/grid';
import { meta as headingMeta, Default as headingDefault } from '@/content/stories/heading';
import { meta as headlineMeta, Default as headlineDefault } from '@/content/stories/headline';
import { meta as hoverCardMeta, Default as hoverCardDefault } from '@/content/stories/hover-card';
import { meta as inputMeta, Default as inputDefault } from '@/content/stories/input';
import { meta as inputGroupMeta, Default as inputGroupDefault } from '@/content/stories/input-group';
import { meta as knobMeta, Default as knobDefault } from '@/content/stories/knob';
import { meta as labelMeta, Default as labelDefault } from '@/content/stories/label';
import { meta as listboxMeta, Default as listboxDefault } from '@/content/stories/listbox';
import { meta as menuButtonMeta, Default as menuButtonDefault } from '@/content/stories/menu-button';
import { meta as menubarMeta, Default as menubarDefault } from '@/content/stories/menubar';
import { meta as meterMeta, Default as meterDefault } from '@/content/stories/meter';
import { meta as navigationMenuMeta, Default as navigationMenuDefault } from '@/content/stories/navigation-menu';
import { meta as numberFieldMeta, Default as numberFieldDefault } from '@/content/stories/number-field';
import { meta as paginationMeta, Default as paginationDefault } from '@/content/stories/pagination';
import { meta as popoverMeta, Default as popoverDefault } from '@/content/stories/popover';
import { meta as radioGroupMeta, Default as radioGroupDefault } from '@/content/stories/radio-group';
import { meta as selectMeta, Default as selectDefault } from '@/content/stories/select';
import { meta as separatorMeta, Default as separatorDefault } from '@/content/stories/separator';
import { meta as sidebarMeta, Default as sidebarDefault } from '@/content/stories/sidebar';
import { meta as sliderMeta, Default as sliderDefault } from '@/content/stories/slider';
import { meta as spinnerMeta, Default as spinnerDefault } from '@/content/stories/spinner';
import { meta as switchMeta, Default as switchDefault } from '@/content/stories/switch';
import { meta as tableMeta, Default as tableDefault } from '@/content/stories/table';
import { meta as tabsMeta, Default as tabsDefault } from '@/content/stories/tabs';
import { meta as tagGroupMeta, Default as tagGroupDefault } from '@/content/stories/tag-group';
import { meta as textareaMeta, Default as textareaDefault } from '@/content/stories/textarea';
import { meta as toastMeta, Default as toastDefault } from '@/content/stories/toast';
import { meta as tocMeta, Default as tocDefault } from '@/content/stories/toc';
import { meta as toolbarMeta, Default as toolbarDefault } from '@/content/stories/toolbar';
import { meta as tooltipMeta, Default as tooltipDefault } from '@/content/stories/tooltip';
import { meta as treeMeta, Default as treeDefault } from '@/content/stories/tree';
import { meta as treegridMeta, Default as treegridDefault } from '@/content/stories/treegrid';
import { meta as windowSplitterMeta, Default as windowSplitterDefault } from '@/content/stories/window-splitter';

export type ThemeLabStory = { slug: string; meta: DocsMetaAny; story: DocsStoryAny };

/**
 * The `Default` story of every documented component, keyed by docs slug.
 *
 * @remarks
 * Listed explicitly because stories register themselves at import time and the lab needs them in the server render.
 * `theme-lab-stories.test.ts` fails when a story file is missing here.
 */
export const themeLabStories: ThemeLabStory[] = [
	{ slug: 'alert', meta: alertMeta as DocsMetaAny, story: alertDefault as DocsStoryAny },
	{ slug: 'autocomplete', meta: autocompleteMeta as DocsMetaAny, story: autocompleteDefault as DocsStoryAny },
	{ slug: 'avatar', meta: avatarMeta as DocsMetaAny, story: avatarDefault as DocsStoryAny },
	{ slug: 'badge', meta: badgeMeta as DocsMetaAny, story: badgeDefault as DocsStoryAny },
	{ slug: 'breadcrumb', meta: breadcrumbMeta as DocsMetaAny, story: breadcrumbDefault as DocsStoryAny },
	{ slug: 'button', meta: buttonMeta as DocsMetaAny, story: buttonDefault as DocsStoryAny },
	{ slug: 'button-group', meta: buttonGroupMeta as DocsMetaAny, story: buttonGroupDefault as DocsStoryAny },
	{ slug: 'calendar', meta: calendarMeta as DocsMetaAny, story: calendarDefault as DocsStoryAny },
	{ slug: 'carousel', meta: carouselMeta as DocsMetaAny, story: carouselDefault as DocsStoryAny },
	{ slug: 'checkbox', meta: checkboxMeta as DocsMetaAny, story: checkboxDefault as DocsStoryAny },
	{ slug: 'checkbox-group', meta: checkboxGroupMeta as DocsMetaAny, story: checkboxGroupDefault as DocsStoryAny },
	{ slug: 'chip', meta: chipMeta as DocsMetaAny, story: chipDefault as DocsStoryAny },
	{ slug: 'chip-list', meta: chipListMeta as DocsMetaAny, story: chipListDefault as DocsStoryAny },
	{ slug: 'combobox', meta: comboboxMeta as DocsMetaAny, story: comboboxDefault as DocsStoryAny },
	{ slug: 'cycle-toggle', meta: cycleToggleMeta as DocsMetaAny, story: cycleToggleDefault as DocsStoryAny },
	{ slug: 'date-field', meta: dateFieldMeta as DocsMetaAny, story: dateFieldDefault as DocsStoryAny },
	{ slug: 'date-input', meta: dateInputMeta as DocsMetaAny, story: dateInputDefault as DocsStoryAny },
	{
		slug: 'date-range-picker',
		meta: dateRangePickerMeta as DocsMetaAny,
		story: dateRangePickerDefault as DocsStoryAny,
	},
	{ slug: 'dialog', meta: dialogMeta as DocsMetaAny, story: dialogDefault as DocsStoryAny },
	{ slug: 'disclosure', meta: disclosureMeta as DocsMetaAny, story: disclosureDefault as DocsStoryAny },
	{ slug: 'feed', meta: feedMeta as DocsMetaAny, story: feedDefault as DocsStoryAny },
	{ slug: 'field', meta: fieldMeta as DocsMetaAny, story: fieldDefault as DocsStoryAny },
	{ slug: 'form', meta: formMeta as DocsMetaAny, story: formDefault as DocsStoryAny },
	{ slug: 'grid', meta: gridMeta as DocsMetaAny, story: gridDefault as DocsStoryAny },
	{ slug: 'heading', meta: headingMeta as DocsMetaAny, story: headingDefault as DocsStoryAny },
	{ slug: 'headline', meta: headlineMeta as DocsMetaAny, story: headlineDefault as DocsStoryAny },
	{ slug: 'hover-card', meta: hoverCardMeta as DocsMetaAny, story: hoverCardDefault as DocsStoryAny },
	{ slug: 'input', meta: inputMeta as DocsMetaAny, story: inputDefault as DocsStoryAny },
	{ slug: 'input-group', meta: inputGroupMeta as DocsMetaAny, story: inputGroupDefault as DocsStoryAny },
	{ slug: 'knob', meta: knobMeta as DocsMetaAny, story: knobDefault as DocsStoryAny },
	{ slug: 'label', meta: labelMeta as DocsMetaAny, story: labelDefault as DocsStoryAny },
	{ slug: 'listbox', meta: listboxMeta as DocsMetaAny, story: listboxDefault as DocsStoryAny },
	{ slug: 'menu-button', meta: menuButtonMeta as DocsMetaAny, story: menuButtonDefault as DocsStoryAny },
	{ slug: 'menubar', meta: menubarMeta as DocsMetaAny, story: menubarDefault as DocsStoryAny },
	{ slug: 'meter', meta: meterMeta as DocsMetaAny, story: meterDefault as DocsStoryAny },
	{ slug: 'navigation-menu', meta: navigationMenuMeta as DocsMetaAny, story: navigationMenuDefault as DocsStoryAny },
	{ slug: 'number-field', meta: numberFieldMeta as DocsMetaAny, story: numberFieldDefault as DocsStoryAny },
	{ slug: 'pagination', meta: paginationMeta as DocsMetaAny, story: paginationDefault as DocsStoryAny },
	{ slug: 'popover', meta: popoverMeta as DocsMetaAny, story: popoverDefault as DocsStoryAny },
	{ slug: 'radio-group', meta: radioGroupMeta as DocsMetaAny, story: radioGroupDefault as DocsStoryAny },
	{ slug: 'select', meta: selectMeta as DocsMetaAny, story: selectDefault as DocsStoryAny },
	{ slug: 'separator', meta: separatorMeta as DocsMetaAny, story: separatorDefault as DocsStoryAny },
	{ slug: 'sidebar', meta: sidebarMeta as DocsMetaAny, story: sidebarDefault as DocsStoryAny },
	{ slug: 'slider', meta: sliderMeta as DocsMetaAny, story: sliderDefault as DocsStoryAny },
	{ slug: 'spinner', meta: spinnerMeta as DocsMetaAny, story: spinnerDefault as DocsStoryAny },
	{ slug: 'switch', meta: switchMeta as DocsMetaAny, story: switchDefault as DocsStoryAny },
	{ slug: 'table', meta: tableMeta as DocsMetaAny, story: tableDefault as DocsStoryAny },
	{ slug: 'tabs', meta: tabsMeta as DocsMetaAny, story: tabsDefault as DocsStoryAny },
	{ slug: 'tag-group', meta: tagGroupMeta as DocsMetaAny, story: tagGroupDefault as DocsStoryAny },
	{ slug: 'textarea', meta: textareaMeta as DocsMetaAny, story: textareaDefault as DocsStoryAny },
	{ slug: 'toast', meta: toastMeta as DocsMetaAny, story: toastDefault as DocsStoryAny },
	{ slug: 'toc', meta: tocMeta as DocsMetaAny, story: tocDefault as DocsStoryAny },
	{ slug: 'toolbar', meta: toolbarMeta as DocsMetaAny, story: toolbarDefault as DocsStoryAny },
	{ slug: 'tooltip', meta: tooltipMeta as DocsMetaAny, story: tooltipDefault as DocsStoryAny },
	{ slug: 'tree', meta: treeMeta as DocsMetaAny, story: treeDefault as DocsStoryAny },
	{ slug: 'treegrid', meta: treegridMeta as DocsMetaAny, story: treegridDefault as DocsStoryAny },
	{ slug: 'window-splitter', meta: windowSplitterMeta as DocsMetaAny, story: windowSplitterDefault as DocsStoryAny },
];
