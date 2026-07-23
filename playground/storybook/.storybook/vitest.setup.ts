import { beforeAll } from 'vitest';
import { setProjectAnnotations } from '@ecopages/storybook-radiant-vite';
import '@ecopages/radiant/client/install-hydrator';
import * as projectAnnotations from './preview';

const annotations = setProjectAnnotations([projectAnnotations]);

beforeAll(annotations.beforeAll);
