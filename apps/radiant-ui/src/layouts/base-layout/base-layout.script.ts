import { createRouter } from '@ecopages/browser-router/client';
import { keepDocsThemeStylesheetLast } from '@/lib/docs-theme-preview';
import { registerCodeCopy } from './code-copy';

createRouter();
keepDocsThemeStylesheetLast();
registerCodeCopy();
