import type { RuiAlertElement } from '@ecopages/radiant-ui/alert';

const validAlert: RuiAlertElement | null = null;
void validAlert;

const alert = <rui-alert variant="info" />;
void alert;

// @ts-expect-error unsupported variants are rejected by the built class declarations
const invalidAlert = <rui-alert variant="nope" />;
void invalidAlert;
