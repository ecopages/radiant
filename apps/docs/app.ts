import { installLightDomShim } from '@ecopages/radiant/server/light-dom-shim';
import { EcopagesApp } from '@ecopages/core';
import appConfig from './eco.config';

installLightDomShim();

const app = new EcopagesApp({ appConfig });

await app.start();
