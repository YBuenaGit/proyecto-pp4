import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const retentionClientSource = readFileSync(
  new URL("../../src/app/(app)/retenciones/retentions-client.tsx", import.meta.url),
  "utf8",
);
const retentionServiceSource = readFileSync(
  new URL("../../src/lib/retentions-service.ts", import.meta.url),
  "utf8",
);
const retentionConstantsSource = readFileSync(
  new URL("../../src/lib/retentions.ts", import.meta.url),
  "utf8",
);
const expedientFormSource = readFileSync(
  new URL("../../src/app/(app)/despacho/expedientes/expedient-form.tsx", import.meta.url),
  "utf8",
);
const expedientActionsSource = readFileSync(
  new URL("../../src/app/(app)/despacho/actions.ts", import.meta.url),
  "utf8",
);
const expedientCodeSource = readFileSync(
  new URL("../../src/app/(app)/despacho/expedientes/expedient-code-combobox.tsx", import.meta.url),
  "utf8",
);
const expedientCodesSource = readFileSync(
  new URL("../../src/lib/constants/codigosExpedientes.ts", import.meta.url),
  "utf8",
);

test("retenciones permite fechas nuevas, color/observacion opcionales y adjuntos removibles", () => {
  assert.match(retentionClientSource, /name="actCreatedAt" type="date"/);
  assert.match(retentionClientSource, /name="sentToTribunalAt" type="date"/);
  assert.match(retentionClientSource, /<SelectedFilesInput\s+name="files"/);
  assert.doesNotMatch(retentionClientSource, /<select name="color"[^>]*required/);
  assert.doesNotMatch(retentionClientSource, /<textarea name="description"[^>]*required/);

  assert.match(retentionServiceSource, /actCreatedAt: optionalDate/);
  assert.match(retentionServiceSource, /sentToTribunalAt: optionalDate/);
  assert.match(retentionServiceSource, /color: optionalColor/);
  assert.match(retentionServiceSource, /description: optionalNaturalText/);
  assert.match(retentionConstantsSource, /actCreatedAt: "Fecha de creacion del acta"/);
  assert.match(retentionConstantsSource, /sentToTribunalAt: "Fecha de envio al tribunal de falta"/);
});

test("expedientes internos exige numero, deja descripcion opcional y usa codigo buscable", () => {
  assert.match(expedientFormSource, /name="expedienteNumber"[^>]*required/);
  assert.doesNotMatch(expedientFormSource, /name="description"[^>]*required/);
  assert.match(expedientFormSource, /<ExpedientCodeCombobox defaultValue=\{record\?\.codigo\}/);
  assert.match(expedientFormSource, /<SelectedFilesInput name="attachments" \/>/);
  assert.doesNotMatch(expedientFormSource, /DetailSection title="Expediente interno"/);

  assert.match(expedientActionsSource, /expedienteNumber: z\.string\(\)\.trim\(\)\.min\(1/);
  assert.match(expedientActionsSource, /description: z\s*\.\s*string\(\)\s*\.\s*optional\(\)\s*\.\s*nullable\(\)\s*\.\s*transform\(\(value\) => value \?\? ""\)/);
  assert.match(expedientActionsSource, /description: optionalSentenceText\(formData, "description"\) \?\? ""/);

  assert.match(expedientCodeSource, /<input type="hidden" name="codigo" value=\{selectedCode\}/);
  assert.match(expedientCodeSource, /Todos los codigos \(\$\{CODIGOS_EXPEDIENTES\.length\}\)/);
  assert.match(expedientCodeSource, /setQuery\(\(current\) => `\$\{current\}\$\{event\.key\}`\)/);
  assert.match(expedientCodeSource, /codeDigits\(normalizedCode\)\.includes\(queryDigits\)/);
  assert.match(expedientCodeSource, /onClick=\{\(\) => selectOption\(item\)\}/);
  assert.doesNotMatch(expedientCodeSource, /<select\s+name="codigo"/);
  assert.match(expedientCodeSource, /normalizedDescription\.startsWith\(normalizedQuery\)/);
  assert.doesNotMatch(expedientCodeSource, /slice\(0,\s*12\)/);
});

test("mantiene completos los codigos de expediente del PDF", () => {
  const codes = [...expedientCodesSource.matchAll(/codigo: "(GENE\d+)"/g)].map((match) => match[1]);

  assert.equal(codes.length, 177);
  assert.equal(codes[0], "GENE00001");
  assert.equal(codes.at(-1), "GENE00177");
});
