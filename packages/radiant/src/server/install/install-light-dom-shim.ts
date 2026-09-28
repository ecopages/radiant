import { installLightDomShim } from '../shim/light-dom-shim';

/** Side-effect install for SSR. Import this module before any `@ecopages/radiant` value import. */
installLightDomShim();

/** Non-undefined export so bundlers keep this side-effect module when externalized. */
export const radiantLightDomShimInstalled = true;
