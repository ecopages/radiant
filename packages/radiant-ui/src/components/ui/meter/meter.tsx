import type { RadiantSlotProps } from '@/types';
import { defineRadiantView } from '@/lib/radiant-view';
import type { RuiMeterProps } from './meter.script';
import { RuiMeter as RuiMeterElement } from './meter.script';
import './meter.css';

export const RuiMeter = defineRadiantView(
	RuiMeterElement,
	({ slot, value, min, max, label }: RuiMeterProps & RadiantSlotProps) => (
		<rui-meter slot={slot} value={value} min={min} max={max} label={label} />
	),
);
