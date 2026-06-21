import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appShellSource = readFileSync(
  new URL("../../src/components/layout/app-shell.tsx", import.meta.url),
  "utf8",
);
const logoutRouteSource = readFileSync(
  new URL("../../src/app/logout/route.ts", import.meta.url),
  "utf8",
);

test("cerrar sesion requiere un envio POST explicito", () => {
  assert.match(appShellSource, /<form action="\/logout" method="post">/);
  assert.doesNotMatch(appShellSource, /href="\/logout"/);
});

test("GET logout no destruye la sesion y POST si lo hace", () => {
  const getHandler = logoutRouteSource.match(
    /export function GET\([^)]*\) \{([\s\S]*?)\n\}/,
  )?.[1];
  const postHandler = logoutRouteSource.match(
    /export async function POST\([^)]*\) \{([\s\S]*?)\n\}/,
  )?.[1];

  assert.ok(getHandler);
  assert.ok(postHandler);
  assert.doesNotMatch(getHandler, /destroySession/);
  assert.match(postHandler, /await destroySession\(\)/);
});
