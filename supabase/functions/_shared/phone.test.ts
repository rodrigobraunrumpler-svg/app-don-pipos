import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizePhone } from "./phone.ts";

test("acepta el número con o sin +51, con espacios o guiones", () => {
  for (const input of ["900000101", "900 000 101", "+51 900 000 101", "51900000101", "900-000-101"]) {
    assert.equal(normalizePhone(input), "+51900000101", input);
  }
});

test("rechaza lo que no son 9 números", () => {
  for (const input of ["90000010", "9000001011", "+52 900 000 101", "abc", ""])
    assert.equal(normalizePhone(input), null, input);
});
