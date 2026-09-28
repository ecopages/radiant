import { addons } from 'storybook/manager-api';
import './manager-fonts.css';
import { radiantUiTheme } from './theme.ts';

addons.setConfig({
	theme: radiantUiTheme,
});
