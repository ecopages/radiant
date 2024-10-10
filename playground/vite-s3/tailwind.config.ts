import type { Config } from 'tailwindcss';
import { colors } from './src/tailwind/colors.js';
import { borderRadius } from './src/tailwind/misc.js';

const config: Config = {
  content: ['./src/**/*.tsx'],
  theme: { extend: { colors, borderRadius } },
  plugins: [],
  safelist: ['hidden'],
};

export default config;
