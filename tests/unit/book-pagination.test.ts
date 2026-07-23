import assert from "node:assert/strict";
import test from "node:test";
import { chunkForBookPages, paginateBookTextSections } from "../../src/lib/book-pagination";

test("pagina textos extensos sin perder contenido", () => {
  const text = Array.from(
    { length: 40 },
    (_, index) => `Parrafo ${index + 1} con informacion relevante para el seguimiento.`,
  ).join("\n\n");
  const pages = paginateBookTextSections([{ label: "Novedad", text }], {
    firstPageLines: 8,
    continuationPageLines: 10,
  });

  assert.ok(pages.length > 2);
  const reconstructed = pages
    .flatMap((page) => page.blocks)
    .map((block) => block.text)
    .join(" ");
  for (let index = 1; index <= 40; index += 1) {
    assert.match(reconstructed, new RegExp(`Parrafo ${index}\\b`));
  }
  assert.match(pages[1].blocks[0].label, /continuacion/);
});

test("agrupa elementos en hojas de tamano estable", () => {
  assert.deepEqual(chunkForBookPages([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunkForBookPages([], 2), [[]]);
});

test("distribuye treinta archivos en cinco hojas sin perder elementos", () => {
  const files = Array.from({ length: 30 }, (_, index) => `archivo-${index + 1}`);
  const pages = chunkForBookPages(files, 6);

  assert.equal(pages.length, 5);
  assert.deepEqual(pages.flat(), files);
  assert.ok(pages.every((page) => page.length <= 6));
});
